import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  Paintbrush,
  Scissors,
  Ban,
  Settings,
  Copy,
  RotateCw,
  Eye,
  Trash2,
  GitCommitHorizontal,
} from 'lucide-react'
import { type App, type Build } from '@/api'
import { useTeamSlug } from '@/contexts/teams'
import { BuildStatusBadge } from '@/components/builds/BuildStatusBadge'
import { DeployDetail } from '@/components/builds/DeployDetail'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { formatRelative } from '@/lib/format'

// notYet reports a control that's part of the UI but not backed by an endpoint
// yet, so the page stays honest instead of silently doing nothing.
const notYet = (what: string) => toast(`${what} isn't available yet`, 'info')

// Deploys is the project's Deployments tab: the redeploy webhook, a row of
// queue/rollback controls, and the recent deployment cards. Build actions are
// wired to the backend; queue/rollback controls and delete are scaffolding.
export function Deploys({
  builds,
  name,
  slug,
}: {
  builds: Build[]
  name: string
  slug: string
}) {
  const list = builds.slice(0, 10)
  const webhookUrl = `${window.location.origin}/api/apps/deploy?app_name=${encodeURIComponent(name)}`

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      toast('Webhook URL copied')
    } catch {
      toast('Could not copy the URL', 'error')
    }
  }

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Deployments</h2>
          <p className="text-sm text-muted-foreground">
            See the last {Math.min(10, builds.length)} deployments for this
            application
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => notYet('Clearing deployments')}
          >
            <Paintbrush className="size-4" />
            Clear deployments
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => notYet('Killing the build')}
          >
            <Scissors className="size-4" />
            Kill Build
          </Button>
          <Button
            size="sm"
            className="border-transparent bg-red-600 text-white hover:bg-red-600/90"
            onClick={() => notYet('Cancelling queues')}
          >
            <Ban className="size-4" />
            Cancel Queues
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => notYet('Rollback configuration')}
          >
            <Settings className="size-4" />
            Configure Rollbacks
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          If you want to re-deploy this application use this URL in the config of
          your git provider or docker
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Webhook URL:</span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 font-mono text-xs">
            <span className="break-all">{webhookUrl}</span>
            <button
              type="button"
              onClick={copyWebhook}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Copy webhook URL"
            >
              <Copy className="size-3.5" />
            </button>
          </span>
          <button
            type="button"
            onClick={() => notYet('Regenerating the webhook URL')}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Regenerate webhook URL"
          >
            <RotateCw className="size-4" />
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No deployments yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((b, i) => (
            <DeploymentCard
              key={b.id}
              build={b}
              index={i + 1}
              name={name}
              slug={slug}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function DeploymentCard({
  build,
  index,
  name,
  slug,
}: {
  build: Build
  index: number
  name: string
  slug: string
}) {
  const { label, dot } = statusInfo(build.status)
  return (
    <li className="rounded-xl border border-border bg-background p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {index}. {label}
            </span>
            <span className={cn('size-2.5 shrink-0 rounded-full', dot)} />
          </div>
          <p className="text-sm text-muted-foreground">Manual deployment</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {formatRelative(build.created_at)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {formatDuration(build.duration_ms)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link
                to={`/teams/${slug}/projects/${encodeURIComponent(name)}/deploys/${build.id}`}
                state={{ build }}
              >
                View
              </Link>
            </Button>
            <Button
              size="sm"
              className="border-transparent bg-red-600 text-white hover:bg-red-600/90"
              onClick={() => notYet('Deleting deployments')}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </li>
  )
}

// DeployPanel shows one deploy's detail inside the project's Deploys section, so
// the project header and submenu stay in context rather than dropping the user
// onto the standalone build page. The build comes from the already-loaded list;
// an unknown id shows an honest fallback back to the list.
export function DeployPanel({
  app,
  builds,
  id,
}: {
  app: App
  builds: Build[]
  id: string
}) {
  const slug = useTeamSlug()
  const build = builds.find((b) => b.id === id)
  return (
    <div className="space-y-4">
      <Link
        to={`/teams/${slug}/projects/${encodeURIComponent(app.name)}/deploys`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Back to deployments
      </Link>
      {build ? (
        <DeployDetail build={build} app={app} />
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          This deploy isn't in the recent history.
        </div>
      )}
    </div>
  )
}
