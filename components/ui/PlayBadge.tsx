/** Round "play" mark shown over the still frame of a video. */
export function PlayBadge({ className = 'size-12' }: { readonly className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink/60 text-cream backdrop-blur-sm ${className}`}
    >
      <svg viewBox="0 0 24 24" className="ml-0.5 size-1/2" fill="currentColor">
        <path d="M8 5.5v13l10.5-6.5z" />
      </svg>
    </span>
  )
}
