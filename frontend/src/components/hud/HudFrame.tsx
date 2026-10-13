import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface HudFrameProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Brighter border + accent glow (use for active/selected/in-flight panels). */
  glow?: boolean
  /** Overlay faint scanlines (default true). */
  scanlines?: boolean
  /** Add hover affordance for clickable frames. */
  interactive?: boolean
  /** Classes for the inner content wrapper (layout/flex lives here). */
  contentClassName?: string
}

function CornerBrackets(): ReactNode {
  return (
    <>
      <span className="hud-corner hud-corner--tl" aria-hidden />
      <span className="hud-corner hud-corner--tr" aria-hidden />
      <span className="hud-corner hud-corner--bl" aria-hidden />
      <span className="hud-corner hud-corner--br" aria-hidden />
    </>
  )
}

/** Panel with corner brackets, thin glowing border and a scanline overlay. */
export function HudFrame({
  children,
  className,
  glow = false,
  scanlines = true,
  interactive = false,
  contentClassName,
  ...rest
}: HudFrameProps): ReactNode {
  return (
    <div
      className={cn(
        'hud-frame',
        glow && 'hud-frame--glow',
        interactive && 'hud-frame--interactive',
        className,
      )}
      {...rest}
    >
      <CornerBrackets />
      <div className={cn('relative z-10', contentClassName)}>{children}</div>
      {scanlines ? <span className="hud-scanlines" aria-hidden /> : null}
    </div>
  )
}
