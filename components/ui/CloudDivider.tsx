/**
 * Bumpy cloud edge between two sections. `className` carries the text colour,
 * which fills the shape — set it to the colour of the section being entered.
 */
export function CloudDivider({
  className = 'text-cream',
  flip = false,
}: {
  readonly className?: string
  readonly flip?: boolean
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none relative -mb-px w-full leading-[0] ${flip ? 'rotate-180' : ''}`}
    >
      <svg
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        className={`block h-[52px] w-full sm:h-[74px] ${className}`}
      >
        <path
          d="M0 90V52c40-26 82-26 122 0 30-40 74-48 112-20 28-40 76-46 112-14 34-42 88-44 122-2 30-44 84-46 116-4 32-44 86-42 116 2 34-40 88-34 114 12 36-34 86-28 112 16 34-30 80-22 104 14 30-26 70-20 94 8 26-22 58-18 82 6 26-20 56-16 78 6 24-18 50-14 72 4 22-16 44-12 66 4v-4z"
          fill="currentColor"
        />
      </svg>
    </div>
  )
}
