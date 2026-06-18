import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api, type App, type AppDomain, type PublicConfig } from '@/api'
import { errorMessage } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

export function Domains({
  app,
  config,
}: {
  app: App
  config: PublicConfig | null
}) {
  const [domains, setDomains] = useState<AppDomain[] | null>(null)
  const [error, setError] = useState('')
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const scheme = config?.tls ? 'https' : 'http'
  const defaultHost = config?.base_domain
    ? `${app.name}.${config.base_domain}`
    : null

  async function load() {
    setError('')
    try {
      const { domains } = await api.appDomains(app.id)
      setDomains(domains)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    void load()
  }, [app.id])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await api.createAppDomain(app.id, input.trim())
      setInput('')
      await load()
    } catch (err) {
      setError(errorMessage(err, 'Could not add domain.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: string) {
    setError('')
    try {
      await api.deleteAppDomain(id)
      await load()
    } catch (err) {
      setError(errorMessage(err, 'Could not detach domain.'))
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-medium">Domain management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Point a hostname's DNS to this server, then attach it here. The gateway
          will route requests for that host straight to {app.name}.
        </p>
      </div>

      {defaultHost && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="min-w-0">
            <a
              href={`${scheme}://${defaultHost}`}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-sm text-primary hover:underline"
            >
              {defaultHost}
            </a>
            <p className="text-xs text-muted-foreground">
              Default domain · always available
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Primary
          </span>
        </div>
      )}

      <form onSubmit={add} className="flex gap-2">
        <Input
          type="text"
          placeholder="app.example.com"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={submitting}
        />
        <Button type="submit" disabled={submitting || !input.trim()}>
          Attach
        </Button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="rounded-xl border border-border">
        {domains === null ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        ) : domains.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No custom domains yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {domains.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <a
                  href={`${scheme}://${d.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-mono text-sm text-primary hover:underline"
                >
                  {d.domain}
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void remove(d.id)}
                  aria-label={`Detach ${d.domain}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
