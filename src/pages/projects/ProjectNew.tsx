import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { api } from '@/api'
import { errorMessage } from '@/lib/errors'
import { useFetch } from '@/lib/useFetch'
import { useTeamSlug } from '@/contexts/teams'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const ENVIRONMENTS = ['production', 'staging', 'development'] as const

// ProjectNew creates a service: a repository to build from and where it deploys.
// Environment variables and volumes are configured later on the service's own
// settings, so the form stays focused on getting a service made. ?project=<id>
// (set by the project page's "Create Service") places it under that project.
export default function ProjectNew() {
  const navigate = useNavigate()
  const slug = useTeamSlug()
  const [params] = useSearchParams()
  const projectId = params.get('project')
  // Where Back/Cancel and the post-create redirect go: the project if we came
  // from one, otherwise the projects list.
  const backTo = projectId
    ? `/teams/${slug}/projects/${projectId}`
    : `/teams/${slug}/projects`

  const [name, setName] = useState('')
  const [repoURL, setRepoURL] = useState('')
  const [branch, setBranch] = useState('main')
  const [environment, setEnvironment] = useState<string>('production')
  const [serverID, setServerID] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Servers are optional — a project can be assigned one later — so a load
  // failure just leaves the picker empty rather than blocking creation.
  const servers = useFetch(() => api.servers(), []).data ?? []

  const canSubmit = name.trim() !== '' && repoURL.trim() !== '' && !busy

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      await api.createApp({
        name: name.trim(),
        repo_url: repoURL.trim(),
        branch: branch.trim() || 'main',
        server_id: serverID || null,
        environment,
        project_id: projectId,
      })
      navigate(backTo)
    } catch (err) {
      setError(errorMessage(err, 'Could not create the service.'))
      setBusy(false)
    }
  }

  return (
    <PageShell className="max-w-2xl">
      <nav className="mb-4">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </Link>
      </nav>

      <PageHeader
        title="New service"
        description="Connect a repository and choose where it deploys."
      />

      <form onSubmit={submit} className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Repository</h2>
          <Field label="Repository URL" htmlFor="repo">
            <Input
              id="repo"
              value={repoURL}
              onChange={(e) => setRepoURL(e.target.value)}
              placeholder="https://gitlab.com/acme/api.git"
              autoComplete="off"
            />
          </Field>
          <Field label="Branch" htmlFor="branch">
            <Input
              id="branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="font-mono"
            />
          </Field>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium">Project</h2>
          <Field
            label="Name"
            htmlFor="name"
            hint="Used as the project's unique identifier within the team."
          >
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="api"
              autoComplete="off"
            />
          </Field>
          <Field label="Environment" htmlFor="environment">
            <div className="inline-flex rounded-lg border border-border p-0.5">
              {ENVIRONMENTS.map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setEnvironment(env)}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm capitalize transition-colors',
                    environment === env
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {env}
                </button>
              ))}
            </div>
          </Field>
          <Field
            label="Server"
            htmlFor="server"
            hint={
              servers.length === 0
                ? 'No servers registered yet — you can assign one after creating.'
                : 'Where this project deploys. You can change it later.'
            }
          >
            <select
              id="server"
              value={serverID}
              onChange={(e) => setServerID(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <option value="">Assign later</option>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.ip_address})
                </option>
              ))}
            </select>
          </Field>
        </section>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canSubmit}>
            {busy ? 'Creating…' : 'Create project'}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link to={backTo}>Cancel</Link>
          </Button>
        </div>
      </form>
    </PageShell>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
