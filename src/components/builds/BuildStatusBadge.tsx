import {
  CheckCircle2,
  CircleSlash,
  Loader2,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusStyle = {
  label: string
  icon: LucideIcon
  className: string
  spin?: boolean
}

// STATUS maps a backend build.status to its label, icon and colour. The colours
// are deliberately literal (not theme tokens) so each state reads at a glance in
// both light and dark mode. Unknown statuses fall through to a neutral badge.
const STATUS: Record<string, StatusStyle> = {
  building: {
    label: 'Building',
    icon: Loader2,
    spin: true,
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  success: {
    label: 'Built',
    icon: CheckCircle2,
    className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  },
  deployed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  },
  deploy_failed: {
    label: 'Deploy failed',
    icon: XCircle,
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  },
  cancelled: {
    label: 'Cancelled',
    icon: CircleSlash,
    className: 'bg-muted text-muted-foreground',
  },
}

export function BuildStatusBadge({ status }: { status: string }) {
  const style = STATUS[status] ?? {
    label: status,
    icon: CircleSlash,
    className: 'bg-muted text-muted-foreground',
  }
  const Icon = style.icon
  return (
    <span
      className={cn(
        'inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-4xl px-2 text-xs font-medium',
        style.className,
      )}
    >
      <Icon className={cn('size-3', style.spin && 'animate-spin')} />
      {style.label}
    </span>
  )
}
