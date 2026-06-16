import { useEffect, useState } from 'react'
import { api, type Server } from '@/api'
import { errorMessage } from '@/lib/errors'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { ServerMonitor } from '@/components/monitoring/ServerMonitor'
import { cn } from '@/lib/utils'

// Monitoring is the server-level resource dashboard. It lists the team's
// servers and shows live host metrics for the selected one. Metrics are
// per-host (multiple apps can share a server), so this lives in the main nav
// rather than under a project.
export default function Monitoring() {
  const [servers, setServers] = useState<Server[] | null>(null)
  const [selected, setSelected] = useState<string>('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .servers()
      .then((list) => {
        setServers(list)
        setSelected((cur) => cur || list[0]?.id || '')
      })
      .catch((err) => setError(errorMessage(err)))
  }, [])

  const active = servers?.find((s) => s.id === selected)

  return (
    <PageShell>
      <PageHeader
        title="Monitoring"
        description="Live resource usage of your servers."
      />

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {servers && servers.length === 0 && (
        <div className="rounded-xl border border-dashed border-border px-4 py-16 text-center text-sm text-muted-foreground">
          No servers registered yet.
        </div>
      )}

      {servers && servers.length > 0 && (
        <div className="space-y-6">
          {servers.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {servers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s.id)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition-colors',
                    s.id === selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          {active && <ServerMonitor key={active.id} server={active} />}
        </div>
      )}
    </PageShell>
  )
}
