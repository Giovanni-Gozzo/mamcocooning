'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

const HINTS: Record<string, string> = {
  ADMIN_PASSWORD_HASH: 'Généré par « npm run hash:password "votre mot de passe" ».',
  SESSION_SECRET: 'Généré par la même commande, sur la deuxième ligne.',
  DATABASE_URL: 'Vercel > Storage > Create Database > Neon. Ajoutée automatiquement.',
  BLOB_READ_WRITE_TOKEN: 'Vercel > Storage > Create Database > Blob. Ajoutée automatiquement.',
  GEMINI_API_KEY: 'Clé gratuite sur aistudio.google.com/apikey.',
}

interface SetupPanelProps {
  readonly missing: readonly string[]
  readonly isDatabaseReady: boolean
}

export function SetupPanel({ missing, isDatabaseReady }: SetupPanelProps) {
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  async function runSetup() {
    setIsRunning(true)
    setStatus(null)

    try {
      const response = await fetch('/api/admin/setup', { method: 'POST' })
      const payload = await response.json()

      if (!response.ok || payload.success !== true) {
        setStatus(payload.error ?? 'Initialisation impossible.')
        return
      }

      setStatus(
        `Base prête : ${payload.data.categoriesSynced} catégories, ${payload.data.importedPhotos} photos importées.`,
      )
      router.refresh()
    } catch {
      setStatus('Initialisation impossible. Vérifiez votre réseau.')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <section className="rounded-[2.5rem] bg-sand/70 p-8 ring-1 ring-clay/45">
      <h2 className="text-2xl">Configuration</h2>

      {missing.length === 0 ? (
        <p className="mt-2 leading-relaxed text-sage-deep">
          Tout est configuré : stockage, base de données et classement automatique.
        </p>
      ) : (
        <>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Variables encore manquantes dans Vercel (Settings &rsaquo; Environment Variables) :
          </p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {missing.map((name) => (
              <li key={name} className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-clay/50">
                <code className="font-mono text-sm font-bold text-terracotta-deep">{name}</code>
                <p className="mt-1 text-sm text-ink-soft">{HINTS[name] ?? ''}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-7 border-t border-clay/50 pt-6">
        <p className="text-sm leading-relaxed text-ink-soft">
          L&rsquo;initialisation crée les tables, enregistre les catégories et importe les photos
          déjà présentes sur le site. Elle peut être relancée sans risque.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void runSetup()}
          disabled={!isDatabaseReady || isRunning}
          className="mt-4"
        >
          {isRunning ? 'Initialisation…' : 'Initialiser la base'}
        </Button>

        {status !== null && (
          <p role="status" className="mt-4 text-sm font-semibold text-ink">
            {status}
          </p>
        )}
      </div>
    </section>
  )
}
