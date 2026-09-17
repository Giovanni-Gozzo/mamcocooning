import { JUNGLE, type JungleName } from './jungle'

export interface JungleSpec {
  readonly name: JungleName
  /** Position and size utilities, e.g. 'left-0 top-10 w-24'. */
  readonly className: string
  readonly color: string
  readonly tilt?: number
  readonly delay?: string
}

/** Tropical foliage and animals from the MAM's logo. Decorative only. */
export function FloatingJungle({
  items,
  className = '',
}: {
  readonly items: readonly JungleSpec[]
  readonly className?: string
}) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      {items.map((item, index) => {
        const Item = JUNGLE[item.name]
        return (
          <Item
            key={`${item.name}-${index}`}
            className={`animate-doodle-bob absolute ${item.className} ${item.color}`}
            style={{
              ['--doodle-tilt' as string]: `${item.tilt ?? 0}deg`,
              animationDelay: item.delay ?? '0s',
            }}
          />
        )
      })}
    </div>
  )
}
