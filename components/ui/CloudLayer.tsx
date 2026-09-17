import { Cloud } from './doodles'

interface CloudSpec {
  readonly top: string
  readonly size: string
  readonly opacity: string
  readonly duration: string
  readonly delay: string
  /** Dropped on phones, where each drifting layer costs real frames. */
  readonly isExtra?: boolean
}

/** Staggered so no two clouds ever cross the screen together. */
const CLOUDS: readonly CloudSpec[] = [
  { top: '2%', size: 'w-32 sm:w-44', opacity: 'opacity-90', duration: '115s', delay: '-10s' },
  { top: '13%', size: 'w-20 sm:w-28', opacity: 'opacity-75', duration: '82s', delay: '-46s' },
  { top: '24%', size: 'w-36 sm:w-52', opacity: 'opacity-60', duration: '145s', delay: '-100s', isExtra: true },
  { top: '7%', size: 'w-24 sm:w-32', opacity: 'opacity-55', duration: '98s', delay: '-24s', isExtra: true },
  { top: '30%', size: 'w-16 sm:w-24', opacity: 'opacity-50', duration: '70s', delay: '-58s', isExtra: true },
]

/**
 * Slow clouds crossing behind a section. Decorative and inert: it never
 * intercepts pointer events and is hidden from assistive technology.
 */
export function CloudLayer({ className = '' }: { readonly className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {CLOUDS.map((cloud) => (
        <Cloud
          key={`${cloud.top}-${cloud.duration}`}
          className={`animate-cloud-drift absolute text-white ${cloud.isExtra === true ? 'cloud-extra ' : ''}${cloud.size} ${cloud.opacity}`}
          style={{
            top: cloud.top,
            animationDuration: cloud.duration,
            animationDelay: cloud.delay,
          }}
        />
      ))}
    </div>
  )
}
