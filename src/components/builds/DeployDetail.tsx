import { useState, type ReactNode } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { type App, type Build } from '@/api'
import { BuildStatusBadge } from '@/components/builds/BuildStatusBadge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDateTime, formatDuration } from '@/lib/format'

// DeployDetail renders one build's full deploy view: a status header, the
// deploy summary, and the captured log. It's shared by the global build page
// (/builds/:id) and the project's Deploys section (/projects/:name/deploys/:id),
// so the two surfaces never drift apart.
export function DeployDetail({ build, app }: { build: Build; app: App | null }) {
  const verb = build.status === 'deployed' ? 'Deployed' : 'Built'
  const liveUrl = app?.server_ip
    ? `http://${app.server_ip}${app.port ? `:${app.port}` : ''}`
    : null

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight">
                {deployTitle(build)}
              </h1>
              <BuildStatusBadge status={build.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(build.created_at)}
              {build.duration_ms != null &&
                ` · ${verb} in ${formatDuration(build.duration_ms)}`}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {app && (
                <span className="font-medium text-foreground">
                  {app.environment}
                </span>
              )}
              <span>@</span>
              <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                {build.commit_hash}
              </code>
            </p>
          </div>
          {liveUrl && (
            <Button asChild size="sm">
              <a href={liveUrl} target="_blank" rel="noreferrer">
                Open deploy
                <ExternalLink />
              </a>
            </Button>
          )}
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Deploy summary</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          <Field label="Started">{formatDateTime(build.created_at)}</Field>
          <Field label="Duration">
            {verb} in {formatDuration(build.duration_ms)}
          </Field>
          <Field label="Image" mono className="sm:col-span-2">
            {build.image_tag || '—'}
          </Field>
          <Field label="Build ID" mono className="sm:col-span-2">
            {build.id}
          </Field>
        </dl>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Deploy log</h2>
          <CopyButton text={build.log_output} />
        </div>
        <BuildLog text={build.log_output} />
      </section>
    </div>
  )
}

// deployTitle echoes Netlify's "Published deploy for X" headline, reading
// naturally for each build state.
function deployTitle(build: Build): string {
  switch (build.status) {
    case 'deployed':
      return `Published deploy for ${build.app_name}`
    case 'building':
      return `Building deploy for ${build.app_name}`
    case 'failed':
    case 'deploy_failed':
      return `Failed deploy for ${build.app_name}`
    default:
      return `Deploy for ${build.app_name}`
  }
}

// Field is one label/value pair in the deploy-summary grid.
function Field({
  label,
  mono,
  className,
  children,
}: {
  label: string
  mono?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm break-all', mono && 'font-mono text-xs')}>
        {children}
      </dd>
    </div>
  )
}

// CopyButton copies the whole log to the clipboard and flips to a brief
// confirmation. It hides itself when there is nothing to copy.
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  if (text.trim() === '') return null
  async function copy() {
    // Clipboard writes can reject when the page lacks focus or runs without a
    // secure context; swallow that so a failed copy never throws at the user.
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore — no clipboard available
    }
  }
  return (
    <Button variant="ghost" size="xs" onClick={copy}>
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied' : 'Copy log'}
    </Button>
  )
}

// BuildLog renders the captured log_output as a numbered terminal panel. The
// log is the full text the backend stored for the build; there is no live tail
// here yet (the SSE endpoint needs a CORS fix before credentialed streaming).
function BuildLog({ text }: { text: string }) {
  if (text.trim() === '') {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
        No log output was captured for this build.
      </div>
    )
  }
  const lines = text.replace(/\n$/, '').split('\n')
  return (
    <pre className="max-h-[60vh] overflow-auto rounded-xl border border-border bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-4">
          <span className="w-8 shrink-0 select-none text-right text-zinc-600">
            {i + 1}
          </span>
          <span className="min-w-0 whitespace-pre-wrap break-all">
            {line || ' '}
          </span>
        </div>
      ))}
    </pre>
  )
}
