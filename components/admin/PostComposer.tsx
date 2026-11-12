'use client'

import { upload } from '@vercel/blob/client'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ImagePreparationError, prepareImageForUpload, readApiResponse } from '@/lib/client-image'
import {
  INCOMING_PREFIX,
  MAX_MEDIA_PER_POST,
  MAX_POST_TEXT_LENGTH,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  isVideoFile,
} from '@/lib/publication-limits'
import type { MediaType } from '@/lib/types'

/** Above this size a file is sent in parts, which survives a shaky connection. */
const MULTIPART_THRESHOLD_BYTES = 20 * 1024 * 1024
const BYTES_PER_MB = 1024 * 1024

type ItemState = 'ready' | 'uploading' | 'processing' | 'done' | 'error'

interface Item {
  readonly key: string
  readonly file: File
  readonly kind: MediaType
  readonly previewUrl: string
  readonly state: ItemState
  readonly progress: number
  readonly error: string | null
}

interface PostComposerProps {
  readonly isReady: boolean
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ImagePreparationError) return error.message
  return error instanceof Error && error.message.length > 0 ? error.message : fallback
}

/** Duration of a video file in seconds, or null when the browser cannot tell. */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    const done = (value: number | null) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }
    video.preload = 'metadata'
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null)
    video.onerror = () => done(null)
    video.src = url
  })
}

async function checkFile(file: File): Promise<string | null> {
  if (!isVideoFile(file)) return null
  if (file.size > MAX_VIDEO_BYTES) {
    return `Vidéo trop lourde (${Math.round(MAX_VIDEO_BYTES / BYTES_PER_MB)} Mo maximum).`
  }
  const duration = await readDuration(file)
  if (duration !== null && duration > MAX_VIDEO_SECONDS + 1) {
    return `Vidéo trop longue (${MAX_VIDEO_SECONDS / 60} minutes maximum).`
  }
  return null
}

function contentTypeOf(file: File, kind: MediaType): string {
  if (file.type.length > 0) return file.type
  return kind === 'video' ? 'video/mp4' : 'image/jpeg'
}

async function postJson<T>(url: string, body: unknown, fallback: string): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await readApiResponse<T>(response, fallback)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

/** Write a text, add photos and videos, publish: like a Facebook post. */
export function PostComposer({ isReady }: PostComposerProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [items, setItems] = useState<readonly Item[]>([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  function update(key: string, patch: Partial<Item>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  async function addFiles(list: FileList | null) {
    if (list === null) return
    const room = MAX_MEDIA_PER_POST - items.length
    const files = Array.from(list).slice(0, Math.max(0, room))
    if (list.length > room) {
      setMessage({ tone: 'error', text: `${MAX_MEDIA_PER_POST} photos et vidéos au maximum par publication.` })
    }

    const added = await Promise.all(
      files.map(async (file, index): Promise<Item> => {
        const problem = await checkFile(file)
        return {
          key: `${Date.now()}-${index}-${file.name}`,
          file,
          kind: isVideoFile(file) ? 'video' : 'image',
          previewUrl: URL.createObjectURL(file),
          state: problem === null ? 'ready' : 'error',
          progress: 0,
          error: problem,
        }
      }),
    )
    setItems((current) => [...current, ...added])
  }

  function remove(key: string) {
    setItems((current) => {
      const target = current.find((item) => item.key === key)
      if (target !== undefined) URL.revokeObjectURL(target.previewUrl)
      return current.filter((item) => item.key !== key)
    })
  }

  async function uploadItem(item: Item, index: number): Promise<string | null> {
    update(item.key, { state: 'uploading', progress: 0, error: null })
    try {
      const file = item.kind === 'image' ? await prepareImageForUpload(item.file) : item.file
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
      const blob = await upload(`${INCOMING_PREFIX}${Date.now()}-${index}.${extension}`, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/uploads',
        contentType: contentTypeOf(file, item.kind),
        multipart: file.size > MULTIPART_THRESHOLD_BYTES,
        onUploadProgress: ({ percentage }) => update(item.key, { progress: Math.round(percentage) }),
      })
      return blob.url
    } catch (error) {
      update(item.key, { state: 'error', error: errorMessage(error, 'Envoi impossible.') })
      return null
    }
  }

  async function publish() {
    const sendable = items.filter((item) => item.state === 'ready')
    if (sendable.length === 0) {
      setMessage({ tone: 'error', text: 'Ajoutez au moins une photo ou une vidéo.' })
      return
    }

    setIsPublishing(true)
    setMessage(null)
    try {
      // 1. Files go straight to storage, one after the other.
      const uploaded: { item: Item; url: string }[] = []
      for (const [index, item] of sendable.entries()) {
        const url = await uploadItem(item, index)
        if (url !== null) uploaded.push({ item, url })
      }
      if (uploaded.length === 0) throw new Error('Aucun fichier n’a pu être envoyé.')

      // 2. The publication is created, still hidden.
      const { post } = await postJson<{ post: { id: string } }>(
        '/api/admin/posts',
        { body: text },
        'Création de la publication impossible.',
      )

      // 3. Each file is cleaned, sorted (and videos re-encoded) by the server.
      let added = 0
      for (const { item, url } of uploaded) {
        update(item.key, { state: 'processing' })
        try {
          await postJson(`/api/admin/posts/${post.id}/media`, { url, kind: item.kind }, 'Ajout impossible.')
          update(item.key, { state: 'done' })
          added += 1
        } catch (error) {
          update(item.key, { state: 'error', error: errorMessage(error, 'Ajout impossible.') })
        }
      }
      if (added === 0) throw new Error('Aucun fichier n’a pu être ajouté à la publication.')

      // 4. Everything goes online at once.
      await postJson(`/api/admin/posts/${post.id}/publish`, {}, 'Mise en ligne impossible.')

      const failed = sendable.length - added
      setMessage({
        tone: failed === 0 ? 'ok' : 'error',
        text:
          failed === 0
            ? 'Publication en ligne !'
            : `Publication en ligne, mais ${failed} fichier(s) n’ont pas pu être ajoutés (en rouge ci-dessous).`,
      })
      setItems((current) => {
        const kept = current.filter((item) => item.state === 'error')
        for (const item of current) if (!kept.includes(item)) URL.revokeObjectURL(item.previewUrl)
        return kept
      })
      if (failed === 0) setText('')
      router.refresh()
    } catch (error) {
      setMessage({ tone: 'error', text: errorMessage(error, 'Publication impossible.') })
    } finally {
      setIsPublishing(false)
    }
  }

  const canPublish = isReady && !isPublishing && items.some((item) => item.state === 'ready')

  return (
    <section className="rounded-[2.5rem] bg-sand/70 p-6 ring-1 ring-clay/45 sm:p-8">
      <h2 className="text-2xl">Nouvelle publication</h2>

      <label htmlFor="post-text" className="sr-only">
        Texte de la publication
      </label>
      <textarea
        id="post-text"
        value={text}
        onChange={(event) => setText(event.target.value.slice(0, MAX_POST_TEXT_LENGTH))}
        disabled={!isReady || isPublishing}
        rows={4}
        placeholder="Racontez la journée… (sans prénom ni nom de famille d’enfant : le texte est publié tel quel)"
        className="mt-5 w-full resize-y rounded-2xl bg-cream px-4 py-3 text-base leading-relaxed text-ink ring-1 ring-clay/60 outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-terracotta disabled:opacity-60"
      />
      <p className="mt-1 text-right text-xs text-ink-faint">
        {text.length} / {MAX_POST_TEXT_LENGTH}
      </p>

      {items.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {items.map((item) => (
            <li key={item.key} className="relative aspect-square overflow-hidden rounded-2xl bg-clay/30">
              {item.kind === 'video' ? (
                <video src={item.previewUrl} muted playsInline preload="metadata" className="size-full object-cover" />
              ) : (
                // A local preview (blob: URL), so next/image does not apply.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt=""
                  className="size-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.visibility = 'hidden'
                  }}
                />
              )}

              {item.kind === 'video' && (
                <span className="absolute bottom-2 left-2 rounded-full bg-ink/75 px-2 py-0.5 text-[0.65rem] font-bold text-cream">
                  ▶ Vidéo
                </span>
              )}

              {item.state !== 'ready' && (
                <span
                  className={`absolute inset-0 grid place-items-center p-2 text-center text-xs font-bold ${
                    item.state === 'error' ? 'bg-terracotta/85 text-cream' : 'bg-ink/55 text-cream'
                  }`}
                >
                  {item.state === 'uploading' && `Envoi ${item.progress} %`}
                  {item.state === 'processing' && (item.kind === 'video' ? 'Conversion…' : 'Rangement…')}
                  {item.state === 'done' && '✓'}
                  {item.state === 'error' && item.error}
                </span>
              )}

              {!isPublishing && item.state !== 'done' && (
                <button
                  type="button"
                  onClick={() => remove(item.key)}
                  aria-label="Retirer ce fichier"
                  className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-cream/90 text-sm font-bold text-ink"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,.heic,.heif,.mov"
        className="sr-only"
        onChange={(event) => {
          void addFiles(event.target.files)
          event.target.value = ''
        }}
      />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={!isReady || isPublishing || items.length >= MAX_MEDIA_PER_POST}
        >
          Ajouter des photos ou des vidéos
        </Button>
        <Button type="button" onClick={() => void publish()} disabled={!canPublish}>
          {isPublishing ? 'Publication…' : 'Publier'}
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        Jusqu’à {MAX_MEDIA_PER_POST} photos et vidéos. Vidéos de {MAX_VIDEO_SECONDS / 60} minutes
        maximum. La position GPS est retirée des photos comme des vidéos.
      </p>

      {message !== null && (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${
            message.tone === 'ok' ? 'bg-sage/15 text-sage-deep' : 'bg-terracotta/12 text-terracotta-deep'
          }`}
        >
          {message.text}
        </p>
      )}
    </section>
  )
}
