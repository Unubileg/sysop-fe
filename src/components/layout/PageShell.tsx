import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// PageShell centers page content at a comfortable width. Every routed page
// wraps its body in one of these so headers and content line up.
export default function PageShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-6 py-6', className)}>
      {children}
    </div>
  )
}

// PageHeader is the title row at the top of a page: heading, optional blurb,
// and an optional action (usually a primary button) pinned to the right.
export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-6 flex items-start justify-between gap-4 border-b border-border pb-4',
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

// Placeholder is a dashed empty-state box. Phase 1 pages show it until the
// real data views land.
export function Placeholder({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
      {children ?? 'Coming soon.'}
    </div>
  )
}
