import { useState, type ComponentType } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  Rocket,
  RotateCcw,
  Hammer,
  CirclePlay,
  GitBranch,
  Loader2,
} from 'lucide-react'
import { api, type App } from '@/api'
import { InfoCard, Row, Section, useHashScroll } from '@/components/settings'
import { GithubIcon, GitlabIcon } from '@/components/icons/GitProviderIcons'
import { useTeamSlug } from '@/contexts/teams'
import { errorMessage } from '@/lib/errors'
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
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'

// ProjectConfiguration renders the project's General tab: deploy actions, the
// code provider, and the settings sysop fully backs (project details + danger
// zone). It's the default project page, reached from the swiper tab bar in
// ProjectDetail.
export function ProjectConfiguration({ app }: { app: App }) {
  return <GeneralSettings app={app} />
}

// GeneralSettings is the project's General tab. Deploy actions and the provider
// picker are UI scaffolding (no backend yet); project details come from the app
// row and are real.
function GeneralSettings({ app }: { app: App }) {
  useHashScroll()
  const server = app.server_ip
    ? `${app.server_ip}${app.port ? `:${app.port}` : ''}`
    : 'Unassigned'

  return (
    <div className="space-y-6">
      <DeploySettings app={app} />
      <Provider />

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
          </div>
          <div className="space-y-1.5 border-t border-destructive/20 pt-4">
            <p className="text-sm font-medium">Delete project</p>
            <p className="text-sm text-muted-foreground">
              Once you delete a project, there is no going back.
            </p>
            <Button variant="destructive" size="sm" disabled>
              Delete this project
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Project lifecycle actions aren't wired to the backend yet.
          </p>
        </div>
      </Section>
    </div>
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

// ACTIONS are the deploy controls. Each opens a confirmation dialog; on confirm
// it calls the matching control-plane endpoint, shows a spinner while in flight,
// and reports the outcome with a toast. `done`/`fail` phrase those toasts.
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
  {
    label: 'Start',
    icon: CirclePlay,
    title: 'Start Application',
    body: 'Start the stopped container for this application.',
    done: 'Application started',
    fail: 'Could not start the application.',
    run: (name) => api.startApp(name),
  },
]

// DeploySettings is the row of deploy actions and toggles at the top of the
// General tab. Each action confirms before calling its endpoint; the toggles
// persist to the app row (autodeploy gates webhook builds, clean cache makes
// the next build skip the cache).
function DeploySettings({ app }: { app: App }) {
  const slug = useTeamSlug()
  const navigate = useNavigate()
  // After a successful Deploy, drop the user on the Deployments tab so they can
  // watch the build they just queued.
  const goToDeploys = () =>
    navigate(
      `/teams/${slug}/projects/${encodeURIComponent(app.name)}/deploys`,
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
            onSuccess={a.label === 'Deploy' ? goToDeploys : undefined}
          />
        ))}
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

// ActionButton is a deploy control guarded by a confirmation dialog. Confirming
// runs the action's endpoint; the dialog stays open with a spinner until it
// resolves, then closes on success or surfaces an error toast.
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
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    setPending(true)
    try {
      await action.run(appName)
      toast(action.done)
      setOpen(false)
      onSuccess?.()
    } catch (err) {
      toast(errorMessage(err, action.fail), 'error')
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button variant={action.primary ? 'default' : 'secondary'}>
          <Icon className="size-4" />
          {action.label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{action.title}</AlertDialogTitle>
          <AlertDialogDescription>{action.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          {/* A plain Button (not AlertDialogAction) so the dialog doesn't
              auto-close — we close it ourselves only once the request succeeds. */}
          <Button
            variant={action.primary ? 'default' : 'secondary'}
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
            {action.label}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const PROVIDERS = [
  { key: 'github', label: 'Github', icon: GithubIcon },
  { key: 'gitlab', label: 'Gitlab', icon: GitlabIcon },
] as const

// Provider lets the user pick where their code comes from. It's UI scaffolding
// today: sysop deploys from the repository on the app row, so each provider
// just points back to Settings.
function Provider() {
  const slug = useTeamSlug()
  const [active, setActive] = useState<string>('github')
  const current = PROVIDERS.find((p) => p.key === active) ?? PROVIDERS[0]
  const Icon = current.icon

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Provider</h3>
          <p className="text-sm text-muted-foreground">
            Select the source of your code
          </p>
        </div>
        <GitBranch className="size-5 shrink-0 text-muted-foreground" />
      </div>

      <div className="flex gap-x-6 gap-y-2 overflow-x-auto border-b border-border pb-2">
        {PROVIDERS.map((p) => {
          const on = active === p.key
          const PIcon = p.icon
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setActive(p.key)}
              className={cn(
                'flex shrink-0 items-center gap-2 border-b-2 px-1 pb-2 text-sm font-medium transition-colors',
                on
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <PIcon className="size-4" />
              {p.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Icon className="size-8 text-muted-foreground" />
        <p className="max-w-md text-sm text-muted-foreground">
          To deploy using {current.label}, you need to configure your account
          first. Please, go to{' '}
          <Link
            to={`/teams/${slug}/settings`}
            className="font-medium text-foreground hover:underline"
          >
            Settings
          </Link>{' '}
          to do so.
        </p>
      </div>
    </Card>
  )
}

// Card is the panel wrapper used by the General tab's deploy/provider blocks.
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5">
      {children}
    </div>
  )
}

// Toggle is a labelled switch pill used for Autodeploy / Clean Cache. The state
// lives on the app row; clicking updates it optimistically and persists via the
// settings endpoint, reverting if the request fails.
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
