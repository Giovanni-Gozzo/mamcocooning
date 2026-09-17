import { ButtonLink } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <span aria-hidden className="text-6xl">
        🧸
      </span>
      <h1 className="mt-6 text-4xl">Cette page a disparu</h1>
      <p className="mt-3 max-w-md leading-relaxed text-ink-soft">
        Elle a dû rouler sous le canapé. Revenons à l&rsquo;accueil.
      </p>
      <div className="mt-8">
        <ButtonLink href="/">Retour à l&rsquo;accueil</ButtonLink>
      </div>
    </div>
  )
}
