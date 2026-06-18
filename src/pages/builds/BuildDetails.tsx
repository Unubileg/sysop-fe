import { Link, useLocation, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { api, type Build } from '@/api'
import { useFetch } from '@/lib/useFetch'
import { useTeamSlug } from '@/contexts/teams'
import PageShell from '@/components/layout/PageShell'
import { DeployDetail } from '@/components/builds/DeployDetail'
import { Skeleton } from '@/components/ui/skeleton'

export default function BuildDetails() {
  const { id } = useParams()
  const slug = useTeamSlug()
  const projectsHome = `/teams/${slug}/projects`
  const serviceBase = `/teams/${slug}/services`
  const location = useLocation()
  const passed = (location.state as { build?: Build } | null)?.build

  const { data, error } = useFetch(async () => {
    const [apps, builds] = await Promise.all([api.apps(), api.builds()])
    const build = builds.find((b) => b.id === id) ?? passed ?? null
    return {
      build,
      app: build ? (apps.find((a) => a.name === build.app_name) ?? null) : null,
    }
  }, [id])
  const build = data?.build ?? passed ?? null
  const app = data?.app ?? null
  const errorText = error || (data && !data.build ? 'Build not found.' : '')

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
              to={`${serviceBase}/${encodeURIComponent(build.app_name)}`}
              className="truncate transition-colors hover:text-foreground"
            >
              {build.app_name}
            </Link>
            <ChevronRight className="size-3.5 shrink-0" />
            <Link
              to={`${serviceBase}/${encodeURIComponent(build.app_name)}/deploys`}
              className="transition-colors hover:text-foreground"
            >
              Deploys
            </Link>
          </>
        )}
      </nav>

      {errorText ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorText}
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
