/** Runs the real ffmpeg on a generated clip: GPS must be gone, size capped, format universal. */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import { describe, expect, test } from 'vitest'
import { posterArgs, prepareVideoFile, transcodeArgs } from '@/lib/video'

const workdir = mkdtempSync(path.join(tmpdir(), 'video-test-'))

function makeClip(name: string): string {
  const file = path.join(workdir, name)
  execFileSync(ffmpegPath as string, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'testsrc=size=1080x1920:rate=25',
    '-f', 'lavfi', '-i', 'sine=frequency=440',
    '-t', '2', '-c:v', 'libx264', '-c:a', 'aac',
    '-metadata', 'location=+43.9990+004.9510/',
    '-metadata', 'com.apple.quicktime.location.ISO6709=+43.9990+004.9510/',
    '-movflags', 'use_metadata_tags', file,
  ])
  return file
}

describe('transcodeArgs', () => {
  test('drops every metadata entry and prepares the file for streaming', () => {
    const args = transcodeArgs('in.mov', 'out.mp4').join(' ')

    expect(args).toContain('-map_metadata -1')
    expect(args).toContain('-movflags +faststart')
    expect(args).toContain('-c:v libx264')
  })

  test('takes the poster at the requested moment', () => {
    expect(posterArgs('a.mp4', 'p.jpg', 0.5)).toEqual(
      expect.arrayContaining(['-ss', '0.5', '-frames:v', '1']),
    )
  })
})

describe('prepareVideoFile', () => {
  test('re-encodes to a 720p H.264 MP4 without the GPS position', { timeout: 60_000 }, async () => {
    const source = makeClip('source.mov')

    const prepared = await prepareVideoFile(source)

    const output = path.join(workdir, 'out.mp4')
    writeFileSync(output, prepared.video)
    // ffmpeg prints the input's tags on stderr; the output must have none.
    let probe = ''
    try {
      execFileSync(ffmpegPath as string, ['-hide_banner', '-i', output], { stdio: 'pipe' })
    } catch (error) {
      probe = String((error as { stderr?: Buffer }).stderr ?? '')
    }
    expect(probe).toContain('h264')
    expect(probe).not.toMatch(/location/i)
    expect(prepared.width).toBe(720)
    expect(prepared.height).toBe(1280)
    expect(prepared.poster.subarray(8, 12).toString()).toBe('WEBP')
  })

  test('explains clearly when the file is not a video', { timeout: 30_000 }, async () => {
    const notAVideo = path.join(workdir, 'notes.txt')
    writeFileSync(notAVideo, 'bonjour')

    await expect(prepareVideoFile(notAVideo)).rejects.toThrow('Cette vidéo n’a pas pu être lue')
  })
})
