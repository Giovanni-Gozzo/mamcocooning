/**
 * Video preparation before storage, the counterpart of lib/image.ts.
 *
 * Phone videos carry the GPS position of where they were shot, are often in
 * HEVC (unplayable in several browsers) and are huge. Each one is therefore
 * re-encoded to H.264/AAC MP4, at most 720p on its short side, with every
 * metadata entry dropped, and a still frame is taken as its poster.
 */
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'
import { UserFacingError } from './errors'

import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS } from './publication-limits'

export { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS }
const SHORT_SIDE_PX = 720
const VIDEO_CRF = 27
const POSTER_EDGE_PX = 1280
const POSTER_QUALITY = 80
const FFMPEG_TIMEOUT_MS = 240_000

/** Scales so the short side is at most 720 px, keeping even dimensions for H.264. */
const SCALE_FILTER =
  `scale='if(gt(iw,ih),-2,min(${SHORT_SIDE_PX},iw))':'if(gt(iw,ih),min(${SHORT_SIDE_PX},ih),-2)'`

export function transcodeArgs(input: string, output: string): string[] {
  return [
    '-hide_banner', '-y',
    '-i', input,
    '-t', String(MAX_VIDEO_SECONDS),
    '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', SCALE_FILTER,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(VIDEO_CRF), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
    // No metadata at all: no GPS position, no device, no date.
    '-map_metadata', '-1', '-map_chapters', '-1',
    '-movflags', '+faststart',
    '-f', 'mp4', output,
  ]
}

export function posterArgs(input: string, output: string, atSeconds: number): string[] {
  return ['-hide_banner', '-y', '-ss', String(atSeconds), '-i', input, '-frames:v', '1', '-q:v', '3', output]
}

function runFfmpeg(args: readonly string[]): Promise<void> {
  if (ffmpegPath === null) return Promise.reject(new Error('ffmpeg introuvable'))
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath as string, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-4000)
    })
    const timer = setTimeout(() => child.kill('SIGKILL'), FFMPEG_TIMEOUT_MS)
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg a échoué (code ${code}) : ${stderr.trim().split('\n').at(-1) ?? ''}`))
    })
  })
}

async function downloadTo(url: string, file: string): Promise<void> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok || response.body === null) {
    throw new Error(`Téléchargement de la vidéo impossible (HTTP ${response.status}).`)
  }
  await pipeline(Readable.fromWeb(response.body as WebReadableStream), createWriteStream(file))
}

export interface PreparedVideo {
  readonly video: Buffer
  readonly poster: Buffer
  readonly width: number
  readonly height: number
}

async function extractPoster(video: string, poster: string): Promise<void> {
  // Half a second in avoids a black first frame; very short clips use frame 0.
  await runFfmpeg(posterArgs(video, poster, 0.5)).catch(() => runFfmpeg(posterArgs(video, poster, 0)))
}

/** Re-encodes a local video file and takes its poster frame. */
export async function prepareVideoFile(input: string): Promise<PreparedVideo> {
  const workdir = await mkdtemp(path.join(tmpdir(), 'mam-video-'))
  const output = path.join(workdir, 'out.mp4')
  const posterJpeg = path.join(workdir, 'poster.jpg')
  try {
    await runFfmpeg(transcodeArgs(input, output)).catch((error: unknown) => {
      console.error('[video] conversion impossible', error)
      throw new UserFacingError('Cette vidéo n’a pas pu être lue. Essayez une vidéo MP4 ou MOV.')
    })
    await extractPoster(output, posterJpeg)

    const { data: poster, info } = await sharp(await readFile(posterJpeg))
      .resize({ width: POSTER_EDGE_PX, height: POSTER_EDGE_PX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: POSTER_QUALITY })
      .toBuffer({ resolveWithObject: true })

    return { video: await readFile(output), poster, width: info.width, height: info.height }
  } finally {
    await rm(workdir, { recursive: true, force: true })
  }
}

/** Downloads a video from storage, then prepares it. */
export async function prepareVideoFromUrl(url: string): Promise<PreparedVideo> {
  const workdir = await mkdtemp(path.join(tmpdir(), 'mam-source-'))
  const input = path.join(workdir, 'source')
  try {
    await downloadTo(url, input)
    return await prepareVideoFile(input)
  } finally {
    await rm(workdir, { recursive: true, force: true })
  }
}
