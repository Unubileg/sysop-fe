import { Star } from 'lucide-react'
import { type App, type Build } from '@/api'
import { cn } from '@/lib/utils'
import { toggleFavorite, useFavorites } from '@/lib/favorites'

export function repoHost(url: string): string {
  try {
    const host = new URL(url).hostname
    if (host.includes('github')) return 'GitHub'
    if (host.includes('gitlab')) return 'GitLab'
    if (host.includes('bitbucket')) return 'Bitbucket'
    return host
  } catch {
    return 'Git'
  }
}

const TILES = [
  'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400',
]

function tileClass(name: string): string {
  let sum = 0
  for (const ch of name) sum += ch.charCodeAt(0)
  return TILES[sum % TILES.length]
}

export function AppMonogram({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
        tileClass(name),
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

type Status = { label: string; className: string }
const NEUTRAL = 'bg-muted text-muted-foreground'
const LIVE = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
const BUILDING = 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
const FAILED = 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
const STOPPED = 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400'

export function appStatus(build: Build | undefined, app?: App): Status {
  if (build?.status === 'building')
    return { label: 'Building', className: BUILDING }
  if (build?.status === 'failed' || build?.status === 'deploy_failed')
    return { label: 'Failed', className: FAILED }

  if (app) {
    if (app.deploy_status === 'running') return { label: 'Live', className: LIVE }
    if (app.deploy_status === 'stopped')
      return { label: 'Stopped', className: STOPPED }
    if (app.deploy_status == null && !build)
      return { label: 'Not deployed', className: NEUTRAL }
  }

  if (!build) return { label: 'Not deployed', className: NEUTRAL }
  switch (build.status) {
    case 'deployed':
      return { label: 'Live', className: LIVE }
    case 'success':
      return { label: 'Built', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' }
    default:
      return { label: build.status, className: NEUTRAL }
  }
}

export function AppStatusPill({ build, app }: { build?: Build; app?: App }) {
  const status = appStatus(build, app)
  return (
    <span
      className={cn(
        'inline-flex h-5 w-fit shrink-0 items-center rounded-4xl px-2 text-xs font-medium',
        status.className,
      )}
    >
      {status.label}
    </span>
  )
}

export function StarButton({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const favorites = useFavorites()
  const on = favorites.has(name)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavorite(name)
      }}
      aria-label={on ? `Unfavorite ${name}` : `Favorite ${name}`}
      aria-pressed={on}
      className={cn(
        'rounded-md p-1 text-muted-foreground transition-colors hover:text-amber-400',
        className,
      )}
    >
      <Star className={cn('size-4', on && 'fill-amber-400 text-amber-400')} />
    </button>
  )
}
