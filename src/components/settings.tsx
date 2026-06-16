import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

// Shared building blocks for settings-style pages (team settings, project
// configuration): an anchored section, an info card with label/value rows, a
// form field, a "not yet" notice, and the hook that scrolls to a #section.

// Section is one anchored block: a heading the nav can scroll to, plus content.
export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-3">
      <div className="space-y-1 border-b border-border pb-3">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

// InfoCard is a titled panel holding a row list.
export function InfoCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  )
}

// Row is one label/value line in an InfoCard. `hint` adds sub-text under the
// label; `copy` adds a copy button next to the value (e.g. an ID).
export function Row({
  label,
  hint,
  mono,
  copy,
  children,
}: {
  label: string
  hint?: string
  mono?: boolean
  copy?: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="space-y-0.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        {hint && (
          <span className="block text-xs text-muted-foreground/70">{hint}</span>
        )}
      </dt>
      <dd
        className={cn(
          'flex items-center gap-2 text-sm break-all sm:col-span-2',
          mono && 'font-mono text-xs',
        )}
      >
        {children}
        {copy && <CopyButton value={copy} />}
      </dd>
    </div>
  )
}

// CopyButton copies a value to the clipboard, flashing a check on success.
export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // Clipboard can be blocked; the value is selectable regardless.
        }
      }}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  )
}

// Field labels a form control with an optional hint below it.
export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// Notice frames an honest "sysop doesn't do this yet" explanation.
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
      {children}
    </div>
  )
}

// useHashScroll scrolls the anchored section into view when the nav links to a
// #section on the page (deep links and same-page anchor clicks alike).
export function useHashScroll() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])
}
