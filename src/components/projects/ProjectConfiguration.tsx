import { useState, type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  Rocket,
  RotateCcw,
  Hammer,
  CirclePlay,
  CircleStop,
} from 'lucide-react'
import { api, type App } from '@/api'
import { InfoCard, Row, Section, useHashScroll } from '@/components/settings'
import { useTeamSlug } from '@/contexts/teams'
import { errorMessage } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'

export function ProjectConfiguration({
  app,
  onChanged,
}: {
  app: App
  onChanged: () => void
}) {
  return <GeneralSettings app={app} onChanged={onChanged} />
}

function GeneralSettings({
  app,
  onChanged,
}: {
  app: App
  onChanged: () => void
}) {
  useHashScroll()
  const server = app.server_ip
    ? `${app.server_ip}${app.port ? `:${app.port}` : ''}`
    : 'Unassigned'

  return (
    <div className="space-y-6">
      <DeploySettings app={app} onChanged={onChanged} />

      <Section
        id="project-details"
        title="Project details"
        description="General information about your project."
      >
        <InfoCard title="Project information">
          <dl className="divide-y divide-border">
            <Row label="Project name">{app.name}</Row>
            <Row label="Project ID" hint="Also known as App ID" mono>
              {app.id}
            </Row>
            <Row label="Repository">
              <a
                href={app.repo_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all hover:underline"
              >
                {app.repo_url}
                <ExternalLink className="size-3 shrink-0" />
              </a>
            </Row>
            <Row label="Branch" mono>
              {app.branch}
            </Row>
            <Row label="Environment">{app.environment}</Row>
            <Row label="Server" mono>
              {server}
            </Row>
            <Row label="Status">{app.status}</Row>
            <Row label="Created">{formatDateTime(app.created_at)}</Row>
          </dl>
        </InfoCard>
      </Section>

      <Section
        id="danger-zone"
        title="Danger zone"
        description="Critical actions that impact your project's availability."
      >
        <div className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Project availability</p>
            <p className="text-sm text-muted-foreground">
              Stopping a project takes it offline on its server; starting it
              brings it back.
            </p>
            <Button variant="outline" size="sm" disabled>
              {app.status === 'active' ? 'Stop project' : 'Start project'}
            </Button>
            <p className="text-xs text-muted-foreground">
              The availability toggle isn't wired to the backend yet.
            </p>
          </div>
          <div className="space-y-1.5 border-t border-destructive/20 pt-4">
            <p className="text-sm font-medium">Delete project</p>
            <p className="text-sm text-muted-foreground">
              Once you delete a project, there is no going back. This permanently
              removes the service along with all of its deployments and domains.
            </p>
            <DeleteServiceButton app={app} />
          </div>
        </div>
      </Section>
    </div>
  )
}

function DeleteServiceButton({ app }: { app: App }) {
  const slug = useTeamSlug()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="destructive" size="sm">
          Delete this project
        </Button>
      }
      resourceNoun="service"
      confirmName={app.name}
      description="This action cannot be undone. This will permanently delete the service, along with all of its deployments and domains."
      onConfirm={() => api.deleteApp(app.name)}
      successToast="Service deleted"
      errorToast="Could not delete the service."
      onSuccess={() =>
        navigate(
          app.project_id
            ? `/teams/${slug}/projects/${app.project_id}`
            : `/teams/${slug}/projects`,
        )
      }
    />
  )
}

type ActionIcon = ComponentType<{ className?: string }>

type DeployAction = {
  label: string
  icon: ActionIcon
  primary?: boolean
  title: string
  body: string
  done: string
  fail: string
  run: (appName: string) => Promise<unknown>
}

const ACTIONS: DeployAction[] = [
  {
    label: 'Deploy',
    icon: Rocket,
    primary: true,
    title: 'Deploy Application',
    body: 'Build the current branch and deploy it. This may take a few minutes.',
    done: 'Deployment queued',
    fail: 'Could not start the deployment.',
    run: (name) => api.deployApp(name),
  },
  {
    label: 'Reload',
    icon: RotateCcw,
    title: 'Reload Application',
    body: 'Restart the running container in place, without rebuilding the image.',
    done: 'Application reloaded',
    fail: 'Could not reload the application.',
    run: (name) => api.reloadApp(name),
  },
  {
    label: 'Rebuild',
    icon: Hammer,
    title: 'Rebuild Application',
    body: 'Rebuild the image from scratch (without the build cache) and redeploy.',
    done: 'Rebuild queued',
    fail: 'Could not start the rebuild.',
    run: (name) => api.rebuildApp(name),
  },
]

function DeploySettings({
  app,
  onChanged,
}: {
  app: App
  onChanged: () => void
}) {
  const slug = useTeamSlug()
  const navigate = useNavigate()
  const running = app.deploy_status === 'running'

  const goToDeploys = () =>
    navigate(
      `/teams/${slug}/services/${encodeURIComponent(app.name)}/deploys`,
    )
  return (
    <Card>
      <h3 className="text-lg font-semibold tracking-tight">Deploy Settings</h3>
      <div className="flex flex-wrap items-center gap-3">
        {ACTIONS.map((a) => (
          <ActionButton
            key={a.label}
            appName={app.name}
            action={a}
            onSuccess={() => {
              onChanged()
              if (a.label === 'Deploy') goToDeploys()
            }}
          />
        ))}
        <StartStopButton
          appName={app.name}
          running={running}
          onChanged={onChanged}
        />
        <Toggle
          appName={app.name}
          settingKey="autodeploy"
          label="Autodeploy"
          checked={app.autodeploy}
        />
        <Toggle
          appName={app.name}
          settingKey="clean_cache"
          label="Clean Cache"
          checked={app.clean_cache}
        />
      </div>
    </Card>
  )
}

function StartStopButton({
  appName,
  running,
  onChanged,
}: {
  appName: string
  running: boolean
  onChanged: () => void
}) {
  const Icon = running ? CircleStop : CirclePlay
  const label = running ? 'Stop' : 'Start'
  const stopClass = 'border-transparent bg-red-600 text-white hover:bg-red-600/90'

  return (
    <ConfirmDialog
      trigger={
        <Button
          variant={running ? 'default' : 'secondary'}
          className={running ? stopClass : undefined}
        >
          <Icon className="size-4" />
          {label}
        </Button>
      }
      title={`${label} Application`}
      description={
        running
          ? 'Are you sure you want to stop this application?'
          : 'Are you sure you want to start this application?'
      }
      confirmLabel={label}
      confirmIcon={Icon}
      confirmVariant={running ? 'default' : 'secondary'}
      confirmClassName={running ? stopClass : undefined}
      errorToast={
        running ? 'Error stopping application' : 'Error starting application'
      }
      onConfirm={async () => {
        if (running) {
          await api.stopApp(appName)
          toast('Application stopped')
        } else {
          await api.startApp(appName)
          toast('Application started')
        }
        onChanged()
      }}
    />
  )
}

function ActionButton({
  appName,
  action,
  onSuccess,
}: {
  appName: string
  action: DeployAction
  onSuccess?: () => void
}) {
  const Icon = action.icon
  return (
    <ConfirmDialog
      trigger={
        <Button variant={action.primary ? 'default' : 'secondary'}>
          <Icon className="size-4" />
          {action.label}
        </Button>
      }
      title={action.title}
      description={action.body}
      confirmLabel={action.label}
      confirmIcon={Icon}
      confirmVariant={action.primary ? 'default' : 'secondary'}
      errorToast={action.fail}
      onConfirm={async () => {
        await action.run(appName)
        toast(action.done)
        onSuccess?.()
      }}
    />
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5">
      {children}
    </div>
  )
}

function Toggle({
  appName,
  settingKey,
  label,
  checked,
}: {
  appName: string
  settingKey: 'autodeploy' | 'clean_cache'
  label: string
  checked: boolean
}) {
  const [on, setOn] = useState(checked)
  const [pending, setPending] = useState(false)

  async function handleClick() {
    if (pending) return
    const next = !on
    setOn(next) // optimistic
    setPending(true)
    try {
      await api.updateAppSettings(appName, { [settingKey]: next })
      toast(`${label} ${next ? 'enabled' : 'disabled'}`)
    } catch (err) {
      setOn(!next) // revert on failure
      toast(errorMessage(err, `Could not update ${label}.`), 'error')
    } finally {
      setPending(false)
    }
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={pending}
      onClick={handleClick}
      className="inline-flex h-8 items-center gap-2.5 rounded-lg border border-border bg-secondary px-3 text-sm font-medium text-secondary-foreground disabled:opacity-70"
    >
      {label}
      <span
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full border transition-colors',
          on ? 'border-white bg-white' : 'border-border bg-muted-foreground/30',
        )}
      >
        <span
          className={cn(
            'inline-block size-3.5 rounded-full bg-black shadow-sm transition-transform',
            on ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}
