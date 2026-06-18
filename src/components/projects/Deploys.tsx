import { useState, type ComponentType } from 'react'
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
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { api, BASE, type App, type Build } from '@/api'
import { useTeamSlug } from '@/contexts/teams'
import { errorMessage } from '@/lib/errors'
import { BuildStatusBadge } from '@/components/builds/BuildStatusBadge'
import { DeployDetail } from '@/components/builds/DeployDetail'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/ui/toast'
import { formatRelative } from '@/lib/format'

export function Deploys({
  builds,
  name,
  slug,
  webhookSecret,
  onBuildDeleted,
  onBuildsChanged,
}: {
  builds: Build[]
  name: string
  slug: string
  webhookSecret: string
  onBuildDeleted: (id: string) => void
  onBuildsChanged: () => void
}) {
  const list = builds.slice(0, 10)
  const hasQueue = builds.some(
    (b) =>
      b.status === 'building' ||
      b.status === 'pending' ||
      b.status === 'queued',
  )
  const [secret, setSecret] = useState(webhookSecret)
  const webhookUrl = `${BASE}/api/deploy/${secret}`

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
          <ClearDeploysDialog
            name={name}
            builds={builds}
            onCleared={onBuildsChanged}
          />
          <CancelBuildsButton
            name={name}
            onDone={onBuildsChanged}
            label="Kill Build"
            icon={Scissors}
            triggerVariant="secondary"
            title="Kill running build"
            body={`Stop the build currently in progress for ${name}. Its git/build/push processes are killed and the build is marked cancelled.`}
          />
          <CancelBuildsButton
            name={name}
            onDone={onBuildsChanged}
            label="Cancel Queues"
            icon={Ban}
            triggerVariant={hasQueue ? 'default' : 'secondary'}
            triggerClassName={
              hasQueue
                ? 'border-transparent bg-red-600 text-white hover:bg-red-600/90'
                : undefined
            }
            disabled={!hasQueue}
            title="Cancel queued builds"
            body={`Cancel every in-flight build for ${name}. Any build that's queued or running is stopped and marked cancelled.`}
          />
          <RollbackDialog name={name} builds={builds} />
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
          <RegenerateWebhookButton name={name} onRegenerated={setSecret} />
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No deployments yet.
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {list.map((b) => (
            <DeploymentRow
              key={b.id}
              build={b}
              name={name}
              slug={slug}
              onDeleted={onBuildDeleted}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function RegenerateWebhookButton({
  name,
  onRegenerated,
}: {
  name: string
  onRegenerated: (secret: string) => void
}) {
  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Regenerate webhook URL"
        >
          <RotateCw className="size-4" />
        </button>
      }
      title="Regenerate webhook URL"
      description={
        <>
          Issue a new secret for {name}'s deploy webhook. The current URL stops
          working immediately — update it anywhere it's configured.
        </>
      }
      confirmLabel="Regenerate"
      confirmIcon={RotateCw}
      errorToast="Could not regenerate the URL."
      onConfirm={async () => {
        const { webhook_secret } = await api.regenerateWebhook(name)
        onRegenerated(webhook_secret)
        toast('Webhook URL regenerated')
      }}
    />
  )
}

function CancelBuildsButton({
  name,
  onDone,
  label,
  icon: Icon,
  triggerVariant,
  triggerClassName,
  disabled,
  title,
  body,
}: {
  name: string
  onDone: () => void
  label: string
  icon: ComponentType<{ className?: string }>
  triggerVariant: 'default' | 'secondary' | 'destructive'
  triggerClassName?: string
  disabled?: boolean
  title: string
  body: string
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant={triggerVariant}
          size="sm"
          className={triggerClassName}
          disabled={disabled}
        >
          <Icon className="size-4" />
          {label}
        </Button>
      }
      title={title}
      description={body}
      confirmLabel={label}
      confirmIcon={Icon}
      cancelLabel="Dismiss"
      errorToast="Could not cancel builds."
      onConfirm={async () => {
        const { cancelled } = await api.cancelBuilds(name)
        toast(
          cancelled > 0
            ? `Cancelled ${cancelled} build${cancelled === 1 ? '' : 's'}`
            : 'No builds in progress',
        )
        onDone()
      }}
    />
  )
}

function ClearDeploysDialog({
  name,
  builds,
  onCleared,
}: {
  name: string
  builds: Build[]
  onCleared: () => void
}) {
  const nothingToClear = builds.length <= 1

  return (
    <ConfirmDialog
      trigger={
        <Button variant="secondary" size="sm" disabled={nothingToClear}>
          <Paintbrush className="size-4" />
          Clear deployments
        </Button>
      }
      title="Clear deployments"
      description={
        <>
          Delete {name}'s entire deployment history except the build that's
          currently running. This removes the build records and can't be undone.
        </>
      }
      confirmLabel="Clear"
      confirmIcon={Paintbrush}
      errorToast="Could not clear deployments."
      onConfirm={async () => {
        const { deleted } = await api.clearDeploys(name)
        toast(
          deleted > 0
            ? `Cleared ${deleted} deployment${deleted === 1 ? '' : 's'}`
            : 'Nothing to clear',
        )
        onCleared()
      }}
    />
  )
}

function RollbackDialog({ name, builds }: { name: string; builds: Build[] }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState('')

  const deployable = builds.filter((b) => b.status === 'deployed')
  const currentId = deployable[0]?.id

  async function rollback(buildID: string) {
    setPending(buildID)
    try {
      await api.rollbackApp(name, buildID)
      toast('Rolled back')
      setOpen(false)
    } catch (err) {
      toast(errorMessage(err, 'Could not roll back.'), 'error')
    } finally {
      setPending('')
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => !pending && setOpen(next)}
    >
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Settings className="size-4" />
          Configure Rollbacks
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Roll back deployment</AlertDialogTitle>
          <AlertDialogDescription>
            Redeploy a previous build's image on {name}'s current port, without
            rebuilding. The running deployment is marked "current".
          </AlertDialogDescription>
        </AlertDialogHeader>

        {deployable.length <= 1 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No earlier deployment to roll back to yet.
          </p>
        ) : (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {deployable.map((b) => {
              const isCurrent = b.id === currentId
              return (
                <li
                  key={b.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <GitCommitHorizontal className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-sm">
                      {b.commit_hash.slice(0, 7)}
                    </span>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {formatRelative(b.created_at)}
                    </p>
                  </div>
                  {isCurrent ? (
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      current
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!!pending}
                      onClick={() => rollback(b.id)}
                    >
                      {pending === b.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RotateCcw className="size-4" />
                      )}
                      Roll back
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={!!pending}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeploymentRow({
  build,
  name,
  slug,
  onDeleted,
}: {
  build: Build
  name: string
  slug: string
  onDeleted: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const short = build.commit_hash.slice(0, 7)

  async function handleDelete() {
    setPending(true)
    try {
      await api.deleteDeploy(build.id)
      toast('Deployment deleted')
      setOpen(false)
      onDeleted(build.id)
    } catch (err) {
      toast(errorMessage(err, 'Could not delete the deployment.'), 'error')
    } finally {
      setPending(false)
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <GitCommitHorizontal className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-sm">{short}</span>
          <BuildStatusBadge status={build.status} />
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          {build.image_tag || '—'}
        </p>
      </div>
      <span className="hidden shrink-0 text-sm text-muted-foreground sm:block">
        {formatRelative(build.created_at)}
      </span>
      <Button asChild variant="ghost" size="icon-sm" aria-label="View deploy">
        <Link
          to={`/teams/${slug}/services/${encodeURIComponent(name)}/deploys/${build.id}`}
          state={{ build }}
        >
          <Eye className="size-4" />
        </Link>
      </Button>
      <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete deploy"
            className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deployment</AlertDialogTitle>
            <AlertDialogDescription>
              Remove deployment <span className="font-mono">{short}</span> from{' '}
              {name}'s history. This deletes the build record and can't be undone.
              The deployment that's currently running can't be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            {/* A plain Button (not AlertDialogAction) so the dialog stays open
                with a spinner until the request resolves. */}
            <Button
              variant="destructive"
              disabled={pending}
              onClick={handleDelete}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

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
        to={`/teams/${slug}/services/${encodeURIComponent(app.name)}/deploys`}
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
