import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface GlitchTextProps {
  text: string
  className?: string
}

/**
 * Title text with a subtle RGB-split glitch. Used sparingly, on titles only.
 * The glitch layers are `aria-hidden` duplicates driven by `data-text`.
 */
export function GlitchText({ text, className }: GlitchTextProps): ReactNode {
  return (
    <span className={cn('glitch', className)} data-text={text}>
      {text}
    </span>
  )
}
