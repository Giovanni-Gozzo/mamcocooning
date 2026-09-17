import { DOODLES, type DoodleName } from './doodles'

export interface DoodleSpec {
  readonly name: DoodleName
  /** Position and size utilities, e.g. 'left-6 top-24 w-12'. */
  readonly className: string
  readonly color: string
  readonly tilt?: number
  readonly delay?: string
}

/** Scatters toys around a section, bobbing gently. Decorative only. */
export function FloatingDoodles({
  doodles,
  className = '',
}: {
  readonly doodles: readonly DoodleSpec[]
  readonly className?: string
}) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      {doodles.map((doodle, index) => {
        const Doodle = DOODLES[doodle.name]
        return (
          <Doodle
            key={`${doodle.name}-${index}`}
            className={`animate-doodle-bob absolute ${doodle.className} ${doodle.color}`}
            style={{
              ['--doodle-tilt' as string]: `${doodle.tilt ?? 0}deg`,
              animationDelay: doodle.delay ?? '0s',
            }}
          />
        )
      })}
    </div>
  )
}
