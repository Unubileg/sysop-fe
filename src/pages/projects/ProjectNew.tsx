import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Search } from 'lucide-react'
import { api, type GitRepo } from '@/api'
import { errorMessage } from '@/lib/errors'
import { useFetch } from '@/lib/useFetch'
import { useTeamSlug } from '@/contexts/teams'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
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

  // Git provider import: picking a repo fills the fields below and links the app to
  // the provider + GitLab project so clone auth and the push webhook work. Editing
  // the repo URL by hand drops the link (it's no longer the imported repo).
  const providers =
    useFetch(() => api.gitProviders(), []).data?.providers ?? []
  const [link, setLink] = useState<{ providerId: string; projectId: number } | null>(
    null,
  )

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Servers are optional — a project can be assigned one later — so a load
  // failure just leaves the picker empty rather than blocking creation.
  const servers = useFetch(() => api.servers(), []).data ?? []

  const canSubmit = name.trim() !== '' && repoURL.trim() !== '' && !busy

  function importRepo(repo: GitRepo, providerId: string) {
    setName(repo.name)
    setRepoURL(repo.http_url_to_repo)
    setBranch(repo.default_branch || 'main')
    setLink({ providerId, projectId: repo.id })
  }

  function editRepoURL(value: string) {
    setRepoURL(value)
    setLink(null) // a hand-edited URL is no longer the imported repo
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      const res = await api.createApp({
        name: name.trim(),
        repo_url: repoURL.trim(),
        branch: branch.trim() || 'main',
        server_id: serverID || null,
        environment,
        project_id: projectId,
        git_provider_id: link?.providerId ?? null,
        gitlab_project_id: link?.projectId ?? null,
      })
      if (res.webhook_warning) toast(res.webhook_warning, 'info')
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
        {providers.length > 0 && (
          <RepoImporter providers={providers} onPick={importRepo} />
        )}

        <section className="space-y-4">
          <h2 className="text-sm font-medium">Repository</h2>
          <Field label="Repository URL" htmlFor="repo">
            <Input
              id="repo"
              value={repoURL}
              onChange={(e) => editRepoURL(e.target.value)}
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

// RepoImporter lets the user pick a provider, search its repositories, and click one
// to fill the form below. Optional — the manual Repository fields always work.
function RepoImporter({
  providers,
  onPick,
}: {
  providers: { id: string; name: string }[]
  onPick: (repo: GitRepo, providerId: string) => void
}) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [repos, setRepos] = useState<GitRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pickedId, setPickedId] = useState<number | null>(null)

  async function load() {
    if (!providerId) return
    setLoading(true)
    setError('')
    try {
      const res = await api.gitRepos(providerId, search.trim() || undefined)
      setRepos(res.repos)
    } catch (err) {
      setError(errorMessage(err, 'Could not reach GitLab.'))
      setRepos([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium">Import from GitLab</h2>
      <div className="flex gap-2">
        <select
          value={providerId}
          onChange={(e) => {
            setProviderId(e.target.value)
            setRepos([])
            setPickedId(null)
          }}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void load()
            }
          }}
          placeholder="Search repositories…"
          autoComplete="off"
        />
        <Button type="button" variant="outline" onClick={() => void load()}>
          <Search className="size-4" />
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : repos.length > 0 ? (
        <ul className="max-h-64 divide-y divide-border overflow-auto rounded-md border border-border">
          {repos.map((repo) => (
            <li key={repo.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(repo, providerId)
                  setPickedId(repo.id)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                  pickedId === repo.id && 'bg-muted',
                )}
              >
                <span className="truncate font-mono text-xs">
                  {repo.path_with_namespace}
                </span>
                {pickedId === repo.id && (
                  <span className="shrink-0 text-xs text-emerald-500">
                    Selected
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Pick a provider and search to list repositories.
        </p>
      )}
    </section>
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
