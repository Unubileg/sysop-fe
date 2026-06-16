import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// A tiny dependency-free toast: a module-level store of transient messages plus
// a <Toaster /> that renders them. Call toast('Saved') from anywhere; the
// Toaster (mounted once in the app shell) shows it and auto-dismisses it.
// Pass 'error' for the destructive (red) variant or 'info' for a neutral one.

export type ToastVariant = 'success' | 'error' | 'info'
export type Toast = { id: number; message: string; variant: ToastVariant }

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<(t: Toast[]) => void>()

function emit() {
  for (const fn of listeners) fn(toasts)
}

export function toast(message: string, variant: ToastVariant = 'success') {
  const id = nextId++
  toasts = [...toasts, { id, message, variant }]
  emit()
  // Auto-dismiss after a few seconds.
  setTimeout(() => dismiss(id), 3000)
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

const TOAST_STYLES: Record<
  ToastVariant,
  {
    icon: typeof CheckCircle2
    container: string
    icon_color: string
    close: string
  }
> = {
  success: {
    icon: CheckCircle2,
    container: 'border-emerald-900 bg-emerald-950 text-emerald-300',
    icon_color: 'text-emerald-400',
    close: 'text-emerald-500/70 hover:text-emerald-300',
  },
  error: {
    icon: CircleAlert,
    container: 'border-red-900 bg-red-950 text-red-300',
    icon_color: 'text-red-400',
    close: 'text-red-500/70 hover:text-red-300',
  },
  info: {
    icon: Info,
    container: 'border-border bg-popover text-popover-foreground',
    icon_color: 'text-muted-foreground',
    close: 'text-muted-foreground hover:text-foreground',
  },
}

// Toaster renders the active toasts in a fixed bottom-right stack. Mount it once
// near the app root.
export function Toaster() {
  const [items, setItems] = useState<Toast[]>(toasts)

  useEffect(() => {
    listeners.add(setItems)
    return () => {
      listeners.delete(setItems)
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {items.map((t) => {
        const style = TOAST_STYLES[t.variant]
        const Icon = style.icon
        return (
          <div
            key={t.id}
            role={t.variant === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg',
              'animate-in slide-in-from-bottom-2 fade-in',
              style.container,
            )}
          >
            <Icon className={cn('size-4 shrink-0', style.icon_color)} />
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className={cn('shrink-0 transition-colors', style.close)}
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
