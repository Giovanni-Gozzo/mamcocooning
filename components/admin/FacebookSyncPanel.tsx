'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface FacebookSyncPanelProps {
  /** Graph API credentials present: the "Récupérer maintenant" button works. */
  readonly isConfigured: boolean
  /** Make sends the posts on its own (FACEBOOK_WEBHOOK_SECRET is set). */
  readonly isWebhookConfigured: boolean
  /** Optional filter; null means every post of the Page goes on the site. */
  readonly hashtag: string | null
}

interface SyncReport {
  readonly imported: number
  readonly failed: number
  readonly remaining: number
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`
}

function describeReport(report: SyncReport): string {
  if (report.imported === 0 && report.failed === 0) return 'Rien de nouveau sur Facebook.'
  const parts = [`${plural(report.imported, 'photo')} ajoutée${report.imported > 1 ? 's' : ''}`]
  if (report.failed > 0) parts.push(`${report.failed} en échec (nouvel essai au prochain passage)`)
  if (report.remaining > 0) parts.push(`${report.remaining} en attente, relancez pour continuer`)
  return `${parts.join(' · ')}.`
}

/** Shows how Facebook photos reach the site, and lets Sigrid fetch them right away. */
export function FacebookSyncPanel({
  isConfigured,
  isWebhookConfigured,
  hashtag,
}: FacebookSyncPanelProps) {
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  async function runSync() {
    setIsRunning(true)
    setStatus(null)

    try {
      const response = await fetch('/api/admin/facebook', { method: 'POST' })
      const payload = await response.json()

      if (!response.ok || payload.success !== true) {
        setStatus(payload.error ?? 'Synchronisation impossible.')
        return
      }

      setStatus(describeReport(payload.data as SyncReport))
      router.refresh()
    } catch {
      setStatus('Synchronisation impossible. Vérifiez votre réseau.')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <section className="rounded-[2.5rem] bg-sand/70 p-8 ring-1 ring-clay/45">
      <h2 className="text-2xl">Depuis Facebook</h2>
      <p className="mt-2 leading-relaxed text-ink-soft">
        {hashtag === null ? (
          <>Chaque post avec photo(s) de la Page Mam Cocooning</>
        ) : (
          <>
            Chaque post de la Page Mam Cocooning contenant{' '}
            <strong className="font-bold text-ink">#{hashtag}</strong>
          </>
        )}{' '}
        devient une publication des Actualités, avec son texte nettoyé (prénoms retirés) et ses
        photos rangées automatiquement.{' '}
        <strong className="font-bold text-ink">Un post par jour au maximum</strong> : s&rsquo;il y en
        a plusieurs, les suivants sortent les jours d&rsquo;après. Ils apparaissent déjà ci-dessus,
        avec leur date de sortie.
      </p>

      {isWebhookConfigured && (
        <p className="mt-5 rounded-2xl bg-sage/15 px-4 py-3 text-sm font-semibold text-sage-deep ring-1 ring-sage/40">
          Branché via Make : les posts arrivent tout seuls.
        </p>
      )}

      {isConfigured ? (
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void runSync()}
            disabled={isRunning}
            className="mt-5"
          >
            {isRunning ? 'Récupération…' : 'Récupérer maintenant'}
          </Button>
          {status !== null && (
            <p role="status" className="mt-4 text-sm font-semibold text-ink">
              {status}
            </p>
          )}
        </>
      ) : (
        !isWebhookConfigured && (
          <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft ring-1 ring-clay/50">
            Pas encore branché : il manque{' '}
            <code className="font-mono font-bold">FACEBOOK_WEBHOOK_SECRET</code> dans Vercel et le
            scénario Make (voir « Photos depuis Facebook » dans le README).
          </p>
        )
      )}
    </section>
  )
}
