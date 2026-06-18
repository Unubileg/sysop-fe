import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Server as ServerIcon,
  MoreHorizontal,
  Activity,
  Container,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { api, type Server } from '@/api'
import { errorMessage } from '@/lib/errors'
import { useTeamSlug } from '@/contexts/teams'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const ONLINE = new Set(['active', 'online', 'running', 'ready'])

// Servers lists the hosts running the sysopd agent — apps deploy onto these.
// Each card links to that server's monitoring and Docker views.
export default function Servers() {
  const slug = useTeamSlug()
  const [servers, setServers] = useState<Server[] | null>(null)
  const [error, setError] = useState('')
  const [reloading, setReloading] = useState(false)

  async function load() {
    setError('')
    try {
      setServers(await api.servers())
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function refresh() {
    setReloading(true)
    await load()
    setReloading(false)
  }

  return (
    <PageShell>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ServerIcon className="size-6 text-muted-foreground" />
            Servers
          </span>
        }
        description="Hosts running the sysopd agent that your applications deploy onto."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={reloading}
            >
              <RefreshCw className={cn(reloading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => toast('Adding servers isn’t available yet', 'info')}
            >
              <Plus />
              Add Server
            </Button>
          </div>
        }
      />

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : servers == null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : servers.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-center">
          <ServerIcon className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No servers yet</p>
          <p className="text-sm text-muted-foreground">
            Register a host running the sysopd agent to deploy applications onto
            it.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((s) => (
            <ServerCard key={s.id} server={s} slug={slug} />
          ))}
        </div>
      )}
    </PageShell>
  )
}

function ServerCard({ server, slug }: { server: Server; slug: string }) {
  const online = ONLINE.has(server.status.toLowerCase())
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ServerIcon className="size-5 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{server.name}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Server actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/teams/${slug}/monitoring`}>
                <Activity className="size-4" />
                Monitoring
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/teams/${slug}/docker`}>
                <Container className="size-4" />
                Docker
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5',
            online ? 'text-emerald-500' : 'text-muted-foreground',
          )}
        >
          <span
            className={cn(
              'size-2 rounded-full',
              online ? 'bg-emerald-500' : 'bg-muted-foreground',
            )}
          />
          {online ? 'Online' : 'Offline'}
        </Badge>
        <Badge variant="outline">Standard</Badge>
      </div>

      <dl className="space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">IP address</dt>
          <dd className="font-mono">{server.ip_address || '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="capitalize">{server.status}</dd>
        </div>
      </dl>
    </div>
  )
}
