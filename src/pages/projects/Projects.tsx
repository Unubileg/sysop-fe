import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Plus, Search, Server as ServerIcon } from 'lucide-react'
import { api, type App, type Build } from '@/api'
import { errorMessage } from '@/lib/errors'
import { useTeamSlug } from '@/contexts/teams'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AppMonogram,
  AppStatusPill,
  StarButton,
  repoHost,
} from '@/components/apps/shared'
import { useFavorites } from '@/lib/favorites'
import { formatRelative } from '@/lib/format'

export default function Projects() {
  const slug = useTeamSlug()
  const [apps, setApps] = useState<App[] | null>(null)
  const [builds, setBuilds] = useState<Build[]>([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const favorites = useFavorites()

  useEffect(() => {
    let alive = true
    // Projects carry their config; builds carry the live deploy outcome and
    // time. We join them client-side: a project's "status" is its latest build.
    Promise.all([api.apps(), api.builds()])
      .then(([a, b]) => {
        if (!alive) return
        setApps(a)
        setBuilds(b)
      })
      .catch((err) => {
        if (!alive) return
        setError(errorMessage(err))
      })
    return () => {
      alive = false
    }
  }, [])

  // latest maps project name -> its most recent build (builds are newest-first).
  const latest = useMemo(() => {
    const m = new Map<string, Build>()
    for (const b of builds) if (!m.has(b.app_name)) m.set(b.app_name, b)
    return m
  }, [builds])

  const visible = useMemo(() => {
    const list = apps ?? []
    const q = query.trim().toLowerCase()
    const filtered = q
      ? list.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.repo_url.toLowerCase().includes(q),
        )
      : list
    // Favourites float to the top; then most recently deployed; then name.
    return [...filtered].sort((a, b) => {
      const fa = favorites.has(a.name)
      const fb = favorites.has(b.name)
      if (fa !== fb) return fa ? -1 : 1
      const ta = latest.get(a.name)?.created_at
      const tb = latest.get(b.name)?.created_at
      if (ta && tb) return tb.localeCompare(ta)
      if (ta) return -1
      if (tb) return 1
      return a.name.localeCompare(b.name)
    })
  }, [apps, query, latest, favorites])

  return (
    <PageShell>
      <PageHeader
        title="Projects"
        description="Apps deployed across your servers."
        action={
          <Button asChild>
            <Link to={`/teams/${slug}/projects/new`}>
              <Plus />
              New project
            </Link>
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} />
      ) : apps == null ? (
        <LoadingState />
      ) : (
        <div className="space-y-6">
          <Stats apps={apps} builds={builds} latest={latest} />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects"
                  className="pl-9"
                />
              </div>
              <span className="hidden shrink-0 text-sm text-muted-foreground sm:block">
                {visible.length} of {apps.length}
              </span>
            </div>

            {visible.length === 0 ? (
              <EmptyState searching={query.trim() !== ''} />
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {visible.map((app) => (
                  <ProjectRow
                    key={app.id}
                    app={app}
                    build={latest.get(app.name)}
                    slug={slug}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}

function Stats({
  apps,
  builds,
  latest,
}: {
  apps: App[]
  builds: Build[]
  latest: Map<string, Build>
}) {
  const live = apps.filter((a) => latest.get(a.name)?.status === 'deployed').length
  const servers = new Set(
    apps.map((a) => a.server_ip).filter((ip): ip is string => !!ip),
  ).size
  const lastDeploy = builds[0]?.created_at

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Projects" value={apps.length} sub="defined" />
      <StatCard label="Live" value={live} sub="latest deploy ok" />
      <StatCard label="Servers" value={servers} sub="in use" />
      <StatCard
        label="Last deploy"
        value={lastDeploy ? formatRelative(lastDeploy) : '—'}
        sub="most recent build"
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: ReactNode
  sub: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

// ProjectRow is one Netlify-style project entry. The whole row is a link into
// the project's overview; a star (local favourite) and chevron overlay the
// right edge.
function ProjectRow({
  app,
  build,
  slug,
}: {
  app: App
  build?: Build
  slug: string
}) {
  return (
    <li className="relative bg-card transition-colors hover:bg-muted/50">
      <Link
        to={`/teams/${slug}/projects/${encodeURIComponent(app.name)}`}
        className="flex items-center gap-4 px-4 py-4 pr-24"
      >
        <AppMonogram name={app.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-medium">{app.name}</span>
            <AppStatusPill build={build} />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            Deploys from {repoHost(app.repo_url)} · {app.branch}
          </p>
        </div>
        <div className="hidden shrink-0 text-right md:block">
          {build ? (
            <>
              <p className="text-sm">Published {formatRelative(build.created_at)}</p>
              <p className="inline-flex items-center justify-end gap-1 text-xs text-muted-foreground">
                <ServerIcon className="size-3" />
                {app.server_ip ?? 'Unassigned'}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Never deployed</p>
          )}
        </div>
      </Link>

      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center gap-2">
        <StarButton name={app.name} className="pointer-events-auto" />
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </li>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] rounded-xl" />
        ))}
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 bg-card px-4 py-4">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="hidden h-8 w-28 md:block" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
      <p className="text-sm font-medium">
        {searching ? 'No matching projects' : 'No projects yet'}
      </p>
      <p className="text-sm text-muted-foreground">
        {searching
          ? 'Try a different name or repository.'
          : 'Projects appear here once they are created.'}
      </p>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-destructive/30 text-center">
      <p className="text-sm font-medium text-destructive">
        Couldn't load projects
      </p>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
