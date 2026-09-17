'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/Button'

export function LoginForm({ isConfigured }: { readonly isConfigured: boolean }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const payload = await response.json()

      if (!response.ok || payload.success !== true) {
        setError(payload.error ?? 'Connexion impossible.')
        return
      }

      setPassword('')
      router.refresh()
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-md rounded-[2.5rem] bg-sand/70 p-8 ring-1 ring-clay/45 sm:p-10"
    >
      <span aria-hidden className="text-4xl">
        🔑
      </span>
      <h1 className="mt-4 text-3xl">Espace privé</h1>
      <p className="mt-2 leading-relaxed text-ink-soft">
        Réservé à Sigrid pour publier les photos de la MAM.
      </p>

      {!isConfigured && (
        <p className="mt-6 rounded-2xl bg-honey/20 px-4 py-3 text-sm text-ink ring-1 ring-honey/40">
          L&rsquo;espace n&rsquo;est pas encore activé : les variables{' '}
          <code className="font-mono text-xs">ADMIN_PASSWORD_HASH</code> et{' '}
          <code className="font-mono text-xs">SESSION_SECRET</code> doivent être ajoutées dans
          Vercel.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-7">
        <label htmlFor="password" className="block text-sm font-semibold">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          disabled={!isConfigured || isSubmitting}
          className="mt-2 w-full rounded-2xl bg-cream px-5 py-4 text-base ring-1 ring-clay/60 transition-shadow outline-none focus:ring-2 focus:ring-terracotta disabled:opacity-50"
        />

        {error !== null && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="mt-3 rounded-2xl bg-terracotta/12 px-4 py-3 text-sm font-semibold text-terracotta-deep"
          >
            {error}
          </motion.p>
        )}

        <Button
          type="submit"
          disabled={!isConfigured || isSubmitting || password.length === 0}
          className="mt-6 w-full"
        >
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </motion.div>
  )
}
