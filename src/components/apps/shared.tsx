import { Star } from 'lucide-react'
import { type Build } from '@/api'
import { cn } from '@/lib/utils'
import { toggleFavorite, useFavorites } from '@/lib/favorites'

// Shared building blocks used by both the apps list and an app's overview page.

// repoHost names the git provider from a repo URL for the "Deploys from X" line.
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

// AppMonogram stands in for Netlify's deploy screenshot: a tile with the app's
// initial, coloured deterministically from its name. Pass a size via className.
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

// appStatus derives an app's liveness from its latest build. No build means the
// app exists but was never deployed.
export function appStatus(build: Build | undefined): Status {
  if (!build) return { label: 'Not deployed', className: NEUTRAL }
  switch (build.status) {
    case 'deployed':
      return { label: 'Live', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' }
    case 'success':
      return { label: 'Built', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' }
    case 'building':
      return { label: 'Building', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' }
    case 'failed':
    case 'deploy_failed':
      return { label: 'Failed', className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' }
    default:
      return { label: build.status, className: NEUTRAL }
  }
}

export function AppStatusPill({ build }: { build?: Build }) {
  const status = appStatus(build)
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

// StarButton toggles a local favourite. preventDefault/stopPropagation keep a
// click from also triggering an enclosing row link.
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
