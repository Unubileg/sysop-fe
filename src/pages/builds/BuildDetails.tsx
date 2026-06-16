import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { api, type App, type Build } from '@/api'
import { errorMessage } from '@/lib/errors'
import { useTeamSlug } from '@/contexts/teams'
import PageShell from '@/components/layout/PageShell'
import { DeployDetail } from '@/components/builds/DeployDetail'
import { Skeleton } from '@/components/ui/skeleton'

export default function BuildDetails() {
  const { id } = useParams()
  const slug = useTeamSlug()
  const projectsHome = `/teams/${slug}/projects`
  const location = useLocation()
  // The list hands the row over via navigation state, so the common path (click
  // through) paints instantly. We still fetch: a deep link or refresh has no
  // state, and we want the parent app (for its environment and live URL).
  const passed = (location.state as { build?: Build } | null)?.build
  const [build, setBuild] = useState<Build | null>(passed ?? null)
  const [app, setApp] = useState<App | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let alive = true
    Promise.all([api.apps(), api.builds()])
      .then(([apps, builds]) => {
        if (!alive) return
        const found = builds.find((b) => b.id === id) ?? passed ?? null
        if (!found) {
          setError('Build not found.')
          return
        }
        setBuild(found)
        setApp(apps.find((a) => a.name === found.app_name) ?? null)
      })
      .catch((err) => {
        if (!alive) return
        setError(errorMessage(err))
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <PageShell>
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to={projectsHome} className="transition-colors hover:text-foreground">
          Projects
        </Link>
        {build && (
          <>
            <ChevronRight className="size-3.5 shrink-0" />
            <Link
              to={`${projectsHome}/${encodeURIComponent(build.app_name)}`}
              className="truncate transition-colors hover:text-foreground"
            >
              {build.app_name}
            </Link>
            <ChevronRight className="size-3.5 shrink-0" />
            <Link
              to={`${projectsHome}/${encodeURIComponent(build.app_name)}/deploys`}
              className="transition-colors hover:text-foreground"
            >
              Deploys
            </Link>
          </>
        )}
      </nav>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : !build ? (
        <DetailSkeleton />
      ) : (
        <DeployDetail build={build} app={app} />
      )}
    </PageShell>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-44" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
