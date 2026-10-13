import { useEffect, useRef, useState } from 'react'

/**
 * Measures a container and returns the scale factor that fits a fixed-size
 * logical canvas inside it. Keeps the SVG edge layer and the HTML node layer
 * in perfect registration because both live inside the scaled canvas.
 */
export function useFitScale(
  logicalWidth: number,
  logicalHeight: number,
): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = (): void => {
      const { width, height } = el.getBoundingClientRect()
      if (width === 0 || height === 0) return
      setScale(Math.min(width / logicalWidth, height / logicalHeight))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [logicalWidth, logicalHeight])

  return [ref, scale]
}
