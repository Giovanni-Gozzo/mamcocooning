'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LogoutButton() {
  const router = useRouter()
  const [isLeaving, setIsLeaving] = useState(false)

  async function logout() {
    setIsLeaving(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.refresh()
    } catch {
      setIsLeaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={isLeaving}
      className="rounded-full bg-sand px-5 py-2.5 text-sm font-semibold text-ink-soft ring-1 ring-clay/60 transition-colors hover:text-terracotta-deep disabled:opacity-50"
    >
      {isLeaving ? 'Déconnexion…' : 'Se déconnecter'}
    </button>
  )
}
