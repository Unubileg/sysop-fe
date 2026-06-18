import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronRight,
  Plus,
  Box,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'
import { api, type Build } from '@/api'
import { useFetch } from '@/lib/useFetch'
import { useTeamSlug } from '@/contexts/teams'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AppMonogram, AppStatusPill, repoHost } from '@/components/apps/shared'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'

// ProjectServices is a project's detail: the services (apps) it groups, with a
// Create Service action. The service detail itself lives at /services/:name.
export default function ProjectServices() {
  const { projectId } = useParams()
  const slug = useTeamSlug()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data, error, loading } = useFetch(async () => {
    const [projects, allApps, allBuilds] = await Promise.all([
      api.projects(),
      api.apps(),
      api.builds(),
    ])
    const project = projects.find((p) => p.id === projectId) ?? null
    return {
      project,
      apps: project ? allApps.filter((a) => a.project_id === projectId) : [],
      builds: allBuilds,
    }
  }, [projectId])
  const project = data?.project ?? null
  const apps = data?.apps ?? []
  // Stable identity so the `latest` memo below doesn't recompute every render.
  const builds = useMemo(() => data?.builds ?? [], [data])
  // Loaded but no matching project → friendly not-found, shown in the error box.
  const errorText = error || (data && !project ? 'Project not found.' : '')

  const latest = useMemo(() => {
    const m = new Map<string, Build>()
    for (const b of builds) if (!m.has(b.app_name)) m.set(b.app_name, b)
    return m
  }, [builds])

  return (
    <PageShell>
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          to={`/teams/${slug}/projects`}
          className="transition-colors hover:text-foreground"
        >
          Projects
        </Link>
        {project && (
          <>
            <ChevronRight className="size-3.5 shrink-0" />
            <span className="truncate text-foreground">{project.name}</span>
          </>
        )}
      </nav>

      {errorText ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorText}
        </p>
      ) : loading || !project ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <PageHeader
            title={project.name}
            description={project.description || 'Services in this project.'}
            action={
              <div className="flex items-center gap-2">
                <Button asChild>
                  <Link to={`/teams/${slug}/services/new?project=${project.id}`}>
                    <Plus />
                    Create Service
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Project actions">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={(e) => {
                        // Keep the menu's close from swallowing the open; defer to
                        // the controlled dialog instead of acting inline.
                        e.preventDefault()
                        setDeleteOpen(true)
                      }}
                    >
                      <Trash2 className="size-4" />
                      Delete project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ConfirmDeleteDialog
                  open={deleteOpen}
                  onOpenChange={setDeleteOpen}
                  resourceNoun="project"
                  confirmName={project.name}
                  description="This action cannot be undone. This will permanently delete the project. Its services must be removed first."
                  onConfirm={() => api.deleteProject(project.id)}
                  successToast="Project deleted"
                  errorToast="Could not delete the project."
                  onSuccess={() => navigate(`/teams/${slug}/projects`)}
                />
              </div>
            }
          />

          {apps.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-center">
              <Box className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No services yet</p>
              <p className="text-sm text-muted-foreground">
                Create a service to deploy it under this project.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {apps.map((a) => (
                <li
                  key={a.id}
                  className="bg-card transition-colors hover:bg-muted/50"
                >
                  <Link
                    to={`/teams/${slug}/services/${encodeURIComponent(a.name)}`}
                    className="flex items-center gap-4 px-4 py-4"
                  >
                    <AppMonogram name={a.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate text-sm font-medium">
                          {a.name}
                        </span>
                        <AppStatusPill build={latest.get(a.name)} app={a} />
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        Deploys from {repoHost(a.repo_url)} · {a.branch}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </PageShell>
  )
}
