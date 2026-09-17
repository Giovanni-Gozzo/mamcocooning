import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

interface SectionTitleProps {
  readonly eyebrow?: string
  readonly title: string
  readonly body?: ReactNode
  readonly align?: 'left' | 'center'
  /** Use 'h1' once per page, for the page's own title. */
  readonly level?: 'h1' | 'h2'
}

export function SectionTitle({
  eyebrow,
  title,
  body,
  align = 'center',
  level = 'h2',
}: SectionTitleProps) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left'
  const Heading = level

  return (
    <div className={`flex flex-col ${alignment} gap-4`}>
      {eyebrow !== undefined && (
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full bg-sage-soft px-4 py-1.5 text-xs font-bold tracking-[0.18em] text-sage-deep uppercase">
            {eyebrow}
          </span>
        </Reveal>
      )}

      <Reveal delay={0.05}>
        <Heading className="max-w-3xl text-[clamp(1.9rem,4.5vw,3.1rem)] leading-[1.08]">
          {title}
        </Heading>
      </Reveal>

      {body !== undefined && (
        <Reveal delay={0.1}>
          <p className="max-w-2xl text-[1.05rem] leading-relaxed text-ink-soft">{body}</p>
        </Reveal>
      )}
    </div>
  )
}
