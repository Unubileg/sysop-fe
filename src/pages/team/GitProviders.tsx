import { useState, type FormEvent } from 'react'
import { GitBranch, Plus, Trash2 } from 'lucide-react'
import { api } from '@/api'
import { errorMessage } from '@/lib/errors'
import { useFetch } from '@/lib/useFetch'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'

// GitProviders connects the team to a self-hosted GitLab so services can be created
// from its repositories and pushes auto-deploy. The token is sent once, validated
// against the live instance, then stored encrypted and never shown again.
export default function GitProviders() {
  const { data, loading, error, reload } = useFetch(() => api.gitProviders(), [])
  const providers = data?.providers ?? []

  const [name, setName] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const canSubmit =
    name.trim() !== '' && baseURL.trim() !== '' && token.trim() !== '' && !busy

  async function connect(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setFormError('')
    try {
      await api.createGitProvider({
        name: name.trim(),
        base_url: baseURL.trim(),
        token: token.trim(),
      })
      setName('')
      setBaseURL('')
      setToken('')
      toast('GitLab connected', 'success')
      reload()
    } catch (err) {
      setFormError(errorMessage(err, 'Could not connect to GitLab.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell className="max-w-2xl">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <GitBranch className="size-6 text-muted-foreground" />
            Git Providers
          </span>
        }
        description="Connect a self-hosted GitLab to create services from its repositories and auto-deploy on push."
      />

      <form
        onSubmit={connect}
        className="space-y-4 rounded-xl border border-border bg-card p-5"
      >
        <h2 className="text-sm font-medium">Connect GitLab</h2>
        <Field label="Name" htmlFor="gp-name" hint="A label for this connection.">
          <Input
            id="gp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="upoint GitLab"
            autoComplete="off"
          />
        </Field>
        <Field label="Base URL" htmlFor="gp-url">
          <Input
            id="gp-url"
            value={baseURL}
            onChange={(e) => setBaseURL(e.target.value)}
            placeholder="http://gitlab.upoint.local"
            autoComplete="off"
            className="font-mono"
          />
        </Field>
        <Field
          label="Access token"
          htmlFor="gp-token"
          hint="A personal/group access token with the 'api' scope. Stored encrypted; never shown again."
        >
          <Input
            id="gp-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="glpat-…"
            autoComplete="off"
            className="font-mono"
          />
        </Field>

        {formError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={!canSubmit}>
          <Plus />
          {busy ? 'Connecting…' : 'Connect'}
        </Button>
      </form>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium">Connected</h2>
        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage(error)}
          </p>
        ) : loading ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : providers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No git providers connected yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {providers.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {p.base_url}
                  </p>
                </div>
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${p.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  }
                  title={`Remove ${p.name}?`}
                  description="Services created from it keep working, but new pushes won't auto-deploy until reconnected."
                  confirmLabel="Remove"
                  confirmIcon={Trash2}
                  errorToast="Could not remove the provider."
                  onConfirm={async () => {
                    await api.deleteGitProvider(p.id)
                    toast('Provider removed', 'success')
                    reload()
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
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
  children: React.ReactNode
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
