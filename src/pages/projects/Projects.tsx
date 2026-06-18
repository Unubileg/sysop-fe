import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FolderGit2, Plus, ChevronRight, Box, Search } from 'lucide-react'
import { api, type App, type Project } from '@/api'
import { errorMessage } from '@/lib/errors'
import { useTeamSlug } from '@/contexts/teams'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/toast'
import { formatRelative } from '@/lib/format'

// Projects lists the team's projects (groups of services) as cards, plus any
// services that aren't in a project yet.
export default function Projects() {
  const slug = useTeamSlug()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [apps, setApps] = useState<App[]>([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  async function load() {
    setError('')
    try {
      const [p, a] = await Promise.all([api.projects(), api.apps()])
      setProjects(p)
      setApps(a)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const ungrouped = useMemo(() => apps.filter((a) => !a.project_id), [apps])

  const visible = useMemo(() => {
    const list = projects ?? []
    const q = query.trim().toLowerCase()
    return q
      ? list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q),
        )
      : list
  }, [projects, query])

  return (
    <PageShell>
      <PageHeader
        title="Projects"
        description="Group your services into projects."
        action={<CreateProject onCreated={load} />}
      />

      {error ? (
        <ErrorState message={error} />
      ) : projects == null ? (
        <LoadingState />
      ) : (
        <div className="space-y-6">
          {projects.length > 0 && (
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects"
                className="pl-9"
              />
            </div>
          )}

          {visible.length === 0 && ungrouped.length === 0 ? (
            <EmptyState searching={query.trim() !== ''} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <ProjectCard key={p.id} project={p} slug={slug} />
              ))}
            </div>
          )}

          {ungrouped.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Ungrouped services
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {ungrouped.map((a) => (
                  <li
                    key={a.id}
                    className="bg-card transition-colors hover:bg-muted/50"
                  >
                    <Link
                      to={`/teams/${slug}/services/${encodeURIComponent(a.name)}`}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Box className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {a.name}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </PageShell>
  )
}

function ProjectCard({ project, slug }: { project: Project; slug: string }) {
  return (
    <Link
      to={`/teams/${slug}/projects/${project.id}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-3">
        <FolderGit2 className="size-6 text-muted-foreground" />
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="truncate font-medium">{project.name}</p>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {project.description || 'No description'}
        </p>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {project.service_count} service
          {project.service_count === 1 ? '' : 's'}
        </span>
        <span>Created {formatRelative(project.created_at)}</span>
      </div>
    </Link>
  )
}

// CreateProject is the "Create Project" button + dialog (name, description).
function CreateProject({ onCreated }: { onCreated: () => void }) {
  const navigate = useNavigate()
  const slug = useTeamSlug()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      const { id } = await api.createProject(name.trim(), description.trim())
      toast('Project created')
      setOpen(false)
      setName('')
      setDescription('')
      onCreated()
      navigate(`/teams/${slug}/projects/${id}`)
    } catch (err) {
      toast(errorMessage(err, 'Could not create the project.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Create Project
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create Project</AlertDialogTitle>
          <AlertDialogDescription>
            Projects group related services together.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            autoFocus
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button onClick={create} disabled={!name.trim() || busy}>
            {busy ? 'Creating…' : 'Create'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-xl" />
      ))}
    </div>
  )
}

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
      <FolderGit2 className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium">
        {searching ? 'No matching projects' : 'No projects yet'}
      </p>
      <p className="text-sm text-muted-foreground">
        {searching
          ? 'Try a different name.'
          : 'Create a project to group your services.'}
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
