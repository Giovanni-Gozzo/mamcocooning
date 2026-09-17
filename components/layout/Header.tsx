'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { NAV_LINKS, SITE } from '@/lib/site'

const SCROLL_THRESHOLD_PX = 24

export function Header() {
  const pathname = usePathname()
  const { scrollY } = useScroll()
  const [isCondensed, setIsCondensed] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useMotionValueEvent(scrollY, 'change', (value) => {
    setIsCondensed(value > SCROLL_THRESHOLD_PX)
  })

  // The panel takes over the viewport, so the page behind it must not scroll.
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <motion.nav
        aria-label="Navigation principale"
        animate={{
          backgroundColor: isCondensed ? 'rgba(253,248,242,0.82)' : 'rgba(253,248,242,0.35)',
          boxShadow: isCondensed
            ? '0 14px 40px -22px rgba(56,45,40,0.45)'
            : '0 0 0 0 rgba(0,0,0,0)',
        }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-full py-2 pr-2.5 pl-3 ring-1 ring-clay/45 backdrop-blur-sm md:backdrop-blur-xl"
      >
        <Link href="/" className="group flex items-center gap-2.5" aria-label={`${SITE.name}, accueil`}>
          <motion.span
            aria-hidden
            className="block size-12 shrink-0"
            whileHover={{ rotate: 8, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 320, damping: 14 }}
          >
            <Image
              src="/img/logo-mam-cocooning.png"
              alt=""
              width={80}
              height={80}
              priority
              className="size-full object-contain"
            />
          </motion.span>
          <span className="font-display text-[1.05rem] leading-none font-semibold tracking-tight">
            Mam<span className="text-terracotta">Cocooning</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)

            return (
              <li key={link.href} className="relative">
                <Link
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative block rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
                    isActive ? 'text-terracotta-deep' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-terracotta-soft"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <a
          href={`tel:${SITE.phoneHref}`}
          className="hidden rounded-full bg-terracotta px-5 py-2.5 text-sm font-semibold text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-terracotta-deep md:inline-flex"
        >
          Nous appeler
        </a>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-controls="menu-mobile"
          className="grid size-10 place-items-center rounded-full bg-sand text-ink ring-1 ring-clay/60 md:hidden"
        >
          <span className="sr-only">{isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
          <span aria-hidden className="relative block h-3.5 w-5">
            <motion.span
              className="absolute left-0 block h-[2px] w-5 rounded-full bg-ink"
              animate={isMenuOpen ? { top: 6, rotate: 45 } : { top: 0, rotate: 0 }}
              transition={{ duration: 0.3 }}
            />
            <motion.span
              className="absolute left-0 block h-[2px] w-5 rounded-full bg-ink"
              animate={isMenuOpen ? { top: 6, rotate: -45 } : { top: 12, rotate: 0 }}
              transition={{ duration: 0.3 }}
            />
          </span>
        </button>
      </motion.nav>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            id="menu-mobile"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-3 max-w-5xl rounded-[2rem] bg-cream/95 p-4 ring-1 ring-clay/50 backdrop-blur-xl md:hidden"
          >
            <ul className="flex flex-col gap-1">
              {NAV_LINKS.map((link, index) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * index, duration: 0.35 }}
                >
                  <Link
                    href={link.href}
                    className="block rounded-2xl px-4 py-3.5 font-display text-lg font-semibold text-ink transition-colors hover:bg-sand"
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
            <a
              href={`tel:${SITE.phoneHref}`}
              className="mt-2 block rounded-2xl bg-terracotta px-4 py-3.5 text-center font-semibold text-cream"
            >
              {SITE.phone}
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
