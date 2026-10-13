import type { ReactNode } from 'react'
import { ParticleField } from '@/components/hud/ParticleField'

/**
 * Layered sci-fi backdrop: deep nebula wash, sweeping radar, reactive grid,
 * drifting particle constellation, CRT scanlines and a slow scan band.
 * Purely decorative — everything uses the live terminal palette, no hex.
 */
export function Background(): ReactNode {
  return (
    <div className="hud-bg" aria-hidden>
      <div className="hud-bg__nebula" />
      <div className="hud-bg__radar" />
      <div className="hud-bg__grid" />
      <ParticleField />
      <div className="hud-bg__scan" />
      <div className="hud-bg__scanlines" />
      <div className="hud-bg__glow" />
      <div className="hud-bg__vignette" />
      <div className="hud-bg__noise" />
    </div>
  )
}
