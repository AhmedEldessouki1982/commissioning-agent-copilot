import type { ReactNode } from 'react'

function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((chunk, index) =>
      chunk.startsWith('**') && chunk.endsWith('**') ? (
        <strong key={index} className="font-semibold text-foreground">
          {chunk.slice(2, -2)}
        </strong>
      ) : (
        <span key={index}>{chunk}</span>
      ),
    )
}

/**
 * Minimal Markdown renderer covering the subset used by contracts
 * (headings, bullet lists, bold). Avoids pulling a markdown dependency.
 */
export function MarkdownLite({ source }: { source: string }): ReactNode {
  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
      {source.split('\n').map((line, index) => {
        const text = line.trim()
        if (text === '') return <div key={index} className="h-1.5" />
        if (text.startsWith('# ')) {
          return (
            <h3 key={index} className="pt-1 text-sm font-semibold tracking-wide text-foreground">
              {inline(text.slice(2))}
            </h3>
          )
        }
        if (text.startsWith('- ')) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" aria-hidden />
              <span>{inline(text.slice(2))}</span>
            </div>
          )
        }
        return <p key={index}>{inline(text)}</p>
      })}
    </div>
  )
}
