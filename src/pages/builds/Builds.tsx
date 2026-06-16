import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, RefreshCw } from 'lucide-react'
import { api, type Build } from '@/api'
import { errorMessage } from '@/lib/errors'
import { useTeamSlug } from '@/contexts/teams'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { BuildStatusBadge } from '@/components/builds/BuildStatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatDateTime, formatDuration } from '@/lib/format'

export default function Builds() {
  const slug = useTeamSlug()
  const [builds, setBuilds] = useState<Build[] | null>(null)
  const [error, setError] = useState('')
  const [reloading, setReloading] = useState(false)

  async function load() {
    setError('')
    try {
      setBuilds(await api.builds())
    } catch (err) {
      setError(
        errorMessage(err),
      )
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function refresh() {
    setReloading(true)
    await load()
    setReloading(false)
  }

  return (
    <PageShell>
      <PageHeader
        title="Builds"
        description="Build history across all applications."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={reloading}
          >
            <RefreshCw className={cn(reloading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : builds == null ? (
        <ListSkeleton />
      ) : builds.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {builds.map((b) => (
            <BuildRow key={b.id} build={b} slug={slug} />
          ))}
        </ul>
      )}
    </PageShell>
  )
}

// BuildRow is one Netlify-style entry: a click target that summarises the build
// and expands to reveal the link into its full deploy details.
function BuildRow({ build, slug }: { build: Build; slug: string }) {
  const [open, setOpen] = useState(false)
  const verb = build.status === 'deployed' ? 'Deployed' : 'Built'

  return (
    <li className="bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-90',
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-medium">
              {build.app_name}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {build.commit_hash.slice(0, 7)}
            </span>
            <BuildStatusBadge status={build.status} />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {build.image_tag || 'No deploy message'}
          </p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-sm">{formatDateTime(build.created_at)}</p>
          <p className="text-xs text-muted-foreground">
            {verb} in {formatDuration(build.duration_ms)}
          </p>
        </div>
      </button>

      {open && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3 pl-11">
          <p className="font-mono text-xs text-muted-foreground">
            {build.image_tag || build.commit_hash}
          </p>
          <Button asChild size="sm">
            <Link to={`/teams/${slug}/builds/${build.id}`} state={{ build }}>
              Go to deploy details
              <ArrowRight />
            </Link>
          </Button>
        </div>
      )}
    </li>
  )
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-card px-4 py-3">
          <Skeleton className="size-4 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="hidden h-8 w-28 sm:block" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
      <p className="text-sm font-medium">No builds yet</p>
      <p className="text-sm text-muted-foreground">
        Builds appear here once an application is deployed.
      </p>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/30 text-center">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-destructive">
          Couldn't load builds
        </p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
