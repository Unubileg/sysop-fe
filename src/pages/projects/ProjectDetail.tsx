import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import {
  api,
  type App,
  type Build,
  type PublicConfig,
} from '@/api'
import { errorMessage } from '@/lib/errors'
import { useTeamSlug } from '@/contexts/teams'
import { Domains } from '@/components/projects/Domains'
import { Environment } from '@/components/projects/Environment'
import { Logs } from '@/components/projects/Logs'
import { Deploys, DeployPanel } from '@/components/projects/Deploys'
import PageShell from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AppMonogram,
  AppStatusPill,
  StarButton,
  repoHost,
} from '@/components/apps/shared'
import { ProjectConfiguration } from '@/components/projects/ProjectConfiguration'
import { cn } from '@/lib/utils'
import { formatRelative } from '@/lib/format'

// TABS are the project's sub-pages, shown as a horizontal swiper tab bar across
// the top (Dokploy-style). Only general/deploys/domains are backed by sysop
// today; the rest are listed honestly and show a "coming soon" placeholder
// until their backend exists. Keys double as the :section URL segment.
const TABS = [
  { key: 'general', label: 'General', ready: true },
  { key: 'environment', label: 'Environment', ready: true },
  { key: 'domains', label: 'Domains', ready: true },
  { key: 'deploys', label: 'Deployments', ready: true },
  { key: 'preview-deployments', label: 'Preview Deployments', ready: false },
  { key: 'schedules', label: 'Schedules', ready: false },
  { key: 'volume-backups', label: 'Volume Backups', ready: false },
  { key: 'logs', label: 'Logs', ready: true },
  { key: 'patches', label: 'Patches', ready: false },
  { key: 'monitoring', label: 'Monitoring', ready: false },
  { key: 'advanced', label: 'Advanced', ready: false },
] as const

export default function ProjectDetail() {
  const { name, section = 'general', tab } = useParams()
  const slug = useTeamSlug()
  const projectsHome = `/teams/${slug}/projects`
  const [app, setApp] = useState<App | null>(null)
  const [builds, setBuilds] = useState<Build[]>([])
  const [config, setConfig] = useState<PublicConfig | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!name) return
    let alive = true
    setLoading(true)
    // Apps give the project; builds give its deploy history (newest-first);
    // config gives the gateway's base domain + TLS so we can show its real URL.
    Promise.all([api.apps(), api.builds(), api.config()])
      .then(([apps, allBuilds, cfg]) => {
        if (!alive) return
        const found = apps.find((a) => a.name === name)
        if (!found) {
          setError('Project not found.')
          return
        }
        setApp(found)
        setBuilds(allBuilds.filter((b) => b.app_name === name))
        setConfig(cfg)
      })
      .catch((err) => {
        if (!alive) return
        setError(errorMessage(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [name])

  // Poll the build list on the General and Deployments tabs so a freshly queued
  // deploy shows up and its status (building → deployed/failed) updates live,
  // without a manual refresh. General is included so the Deploy Settings Start/Stop
  // button can react to a build's outcome. Other tabs don't poll.
  useEffect(() => {
    if (!name || (section !== 'deploys' && section !== 'general')) return
    let alive = true
    const refresh = async () => {
      try {
        // Refetch the app too: its deploy_status is the source of truth for the
        // Deploy Settings Start/Stop button (running ↔ stopped).
        const [apps, all] = await Promise.all([api.apps(), api.builds()])
        if (!alive) return
        const found = apps.find((a) => a.name === name)
        if (found) setApp(found)
        setBuilds(all.filter((b) => b.app_name === name))
      } catch {
        // Transient errors shouldn't disrupt the page; the next tick retries.
      }
    }
    refresh() // immediate, so a just-queued build appears on arrival
    const id = setInterval(refresh, 4000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [name, section])

  return (
    <PageShell>
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to={projectsHome} className="transition-colors hover:text-foreground">
          Projects
        </Link>
        {name && (
          <>
            <ChevronRight className="size-3.5 shrink-0" />
            <span className="truncate text-foreground">{name}</span>
          </>
        )}
      </nav>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : loading || !app ? (
        <DetailSkeleton />
      ) : (
        <ProjectView
          app={app}
          builds={builds}
          section={section}
          tab={tab}
          slug={slug}
          config={config}
          onBuildDeleted={(id) =>
            setBuilds((prev) => prev.filter((b) => b.id !== id))
          }
          onBuildsChanged={() => {
            // Refetch app (deploy_status → Start/Stop) and builds together.
            Promise.all([api.apps(), api.builds()])
              .then(([apps, all]) => {
                const found = apps.find((a) => a.name === name)
                if (found) setApp(found)
                setBuilds(all.filter((b) => b.app_name === name))
              })
              .catch(() => {})
          }}
        />
      )}
    </PageShell>
  )
}

function ProjectView({
  app,
  builds,
  section,
  tab,
  slug,
  config,
  onBuildDeleted,
  onBuildsChanged,
}: {
  app: App
  builds: Build[]
  section: string
  tab?: string
  slug: string
  config: PublicConfig | null
  onBuildDeleted: (id: string) => void
  onBuildsChanged: () => void
}) {
  const latest = builds[0]

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start gap-4 border-b border-border pb-5">
        <AppMonogram name={app.name} className="size-14 text-lg" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {app.name}
            </h1>
            <AppStatusPill build={latest} app={app} />
            <StarButton name={app.name} />
          </div>
          <p className="text-sm text-muted-foreground">
            Deploys from {repoHost(app.repo_url)} · {app.branch}
          </p>
          <p className="text-sm text-muted-foreground">
            {latest
              ? `Published ${formatRelative(latest.created_at)}`
              : 'Never deployed'}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={app.repo_url} target="_blank" rel="noreferrer">
            Open repository
            <ExternalLink />
          </a>
        </Button>
      </header>

      <ProjectTabs name={app.name} active={section} slug={slug} />

      <div className="min-w-0">
        <SectionContent
          app={app}
          builds={builds}
          section={section}
          tab={tab}
          slug={slug}
          config={config}
          onBuildDeleted={onBuildDeleted}
          onBuildsChanged={onBuildsChanged}
        />
      </div>
    </div>
  )
}

function ProjectTabs({
  name,
  active,
  slug,
}: {
  name: string
  active: string
  slug: string
}) {
  const known = TABS.some((t) => t.key === active)
  return (
    <nav className="flex gap-1 overflow-x-auto scrollbar-none border-b border-border pb-2">
      {TABS.map((t) => {
        const on = active === t.key || (!known && t.key === 'general')
        return (
          <Link
            key={t.key}
            to={`/teams/${slug}/services/${encodeURIComponent(name)}/${t.key}`}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              on
                ? 'border-border bg-muted text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

// SectionContent routes the active submenu key to its panel. Only three
// sections are backed by sysop; the rest fall through to a placeholder.
function SectionContent({
  app,
  builds,
  section,
  tab,
  slug,
  config,
  onBuildDeleted,
  onBuildsChanged,
}: {
  app: App
  builds: Build[]
  section: string
  tab?: string
  slug: string
  config: PublicConfig | null
  onBuildDeleted: (id: string) => void
  onBuildsChanged: () => void
}) {
  if (section === 'deploys')
    return tab ? (
      <DeployPanel app={app} builds={builds} id={tab} />
    ) : (
      <Deploys
        builds={builds}
        name={app.name}
        slug={slug}
        webhookSecret={app.webhook_secret}
        onBuildDeleted={onBuildDeleted}
        onBuildsChanged={onBuildsChanged}
      />
    )
  if (section === 'domains') return <Domains app={app} config={config} />
  if (section === 'environment') return <Environment app={app} />
  if (section === 'logs') return <Logs app={app} />
  const known = TABS.find((t) => t.key === section)
  if (known && !known.ready) return <ComingSoon label={known.label} />
  return <ProjectConfiguration app={app} onChanged={onBuildsChanged} />
}

// ComingSoon stands in for Netlify sections sysop doesn't back yet, keeping the
// submenu honest instead of hiding them.
function ComingSoon({ label }: { label: string }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">{label}</h2>
      <div className="flex min-h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
        <p className="text-sm font-medium">Coming soon</p>
        <p className="text-sm text-muted-foreground">
          {label} isn't available in sysop yet.
        </p>
      </div>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 border-b border-border pb-5">
        <Skeleton className="size-14 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="flex gap-2 overflow-hidden border-b border-border pb-2">
        {Array.from({ length: TABS.length }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-lg" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  )
}
