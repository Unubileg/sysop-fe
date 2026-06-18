import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Rocket,
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  Check,
} from 'lucide-react'
import { api, type App, type Build } from '@/api'
import { errorMessage } from '@/lib/errors'
import { useTeamSlug } from '@/contexts/teams'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { BuildStatusBadge } from '@/components/builds/BuildStatusBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'

type Row = {
  id: string
  service: string
  project: string
  environment: string
  server: string
  title: string
  status: string
  createdAt: string
  build: Build
}

type ColumnKey = Exclude<keyof Row, 'id' | 'build'>
const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'service', label: 'Service' },
  { key: 'project', label: 'Project' },
  { key: 'environment', label: 'Environment' },
  { key: 'server', label: 'Server' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created' },
]

const PAGE_SIZES = [10, 25, 50, 100]
const QUEUE_STATUSES = new Set(['building', 'pending', 'queued'])

export default function Builds() {
  const slug = useTeamSlug()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const [reloading, setReloading] = useState(false)

  const [tab, setTab] = useState<'deployments' | 'queue'>('deployments')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState<{ key: ColumnKey; dir: 'asc' | 'desc' }>({
    key: 'createdAt',
    dir: 'desc',
  })
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(0)

  async function load() {
    setError('')
    try {
      const [builds, apps] = await Promise.all([api.builds(), api.apps()])
      const byName = new Map(apps.map((a) => [a.name, a]))
      setRows(builds.map((b) => toRow(b, byName.get(b.app_name))))
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

  const statuses = useMemo(
    () => [...new Set((rows ?? []).map((r) => r.status))].sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    let list = (rows ?? []).slice()
    if (tab === 'queue') list = list.filter((r) => QUEUE_STATUSES.has(r.status))
    if (status !== 'all') list = list.filter((r) => r.status === status)
    if (type !== 'all') list = list.filter(() => type === 'application')
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((r) =>
        [r.service, r.project, r.environment, r.server, r.title, r.status]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    }
    list.sort((a, b) => {
      const cmp =
        sort.key === 'createdAt'
          ? a.createdAt.localeCompare(b.createdAt)
          : String(a[sort.key]).localeCompare(String(b[sort.key]))
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return list
  }, [rows, tab, status, type, search, sort])

  const total = filtered.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, pageCount - 1)
  const start = current * pageSize
  const pageRows = filtered.slice(start, start + pageSize)

  function toggleSort(key: ColumnKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    )
  }

  function reset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(0)
    }
  }

  return (
    <PageShell>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Rocket className="size-6 text-muted-foreground" />
            Deployments
          </span>
        }
        description="All application deployments in one place."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={reloading}
          >
            <RefreshCw className={cn(reloading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
          {(['deployments', 'queue'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t)
                setPage(0)
              }}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                tab === t
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => reset(setSearch)(e.target.value)}
            placeholder="Search by name, project, environment, server..."
            className="max-w-sm"
          />
          <Select
            value={status}
            onChange={reset(setStatus)}
            options={[
              { value: 'all', label: 'All statuses' },
              ...statuses.map((s) => ({ value: s, label: s })),
            ]}
          />
          <Select
            value={type}
            onChange={reset(setType)}
            options={[
              { value: 'all', label: 'All types' },
              { value: 'application', label: 'Application' },
            ]}
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  {COLUMNS.map((c) => (
                    <th key={c.key} className="px-4 py-3 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                      >
                        {c.label}
                        <ArrowUpDown className="size-3.5" />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows == null ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {COLUMNS.map((c) => (
                        <td key={c.key} className="px-4 py-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                      ))}
                      <td className="px-4 py-4" />
                    </tr>
                  ))
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length + 1}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No deployments found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <BuildRow key={r.id} row={r} slug={slug} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select
              value={String(pageSize)}
              onChange={(v) => {
                setPageSize(Number(v))
                setPage(0)
              }}
              options={PAGE_SIZES.map((n) => ({
                value: String(n),
                label: String(n),
              }))}
            />
            <span>
              {total === 0
                ? 'No entries'
                : `Showing ${start + 1} to ${Math.min(start + pageSize, total)} of ${total} entries`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

function BuildRow({ row: r, slug }: { row: Row; slug: string }) {
  return (
    <tr className="border-b border-border transition-colors last:border-0 hover:bg-muted/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Rocket className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate font-medium">{r.service}</p>
            <Badge variant="outline" className="mt-0.5">
              Application
            </Badge>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{r.project}</td>
      <td className="px-4 py-3 text-muted-foreground">{r.environment}</td>
      <td className="px-4 py-3 text-muted-foreground">{r.server}</td>
      <td className="px-4 py-3 text-muted-foreground">{r.title}</td>
      <td className="px-4 py-3">
        <BuildStatusBadge status={r.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
        {formatDateTime(r.createdAt)}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          to={`/teams/${slug}/services/${encodeURIComponent(r.service)}/general`}
          className="inline-flex items-center gap-1 text-sm font-medium transition-colors hover:text-foreground"
        >
          <ExternalLink className="size-4" />
          Open
        </Link>
      </td>
    </tr>
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  const active = options.find((o) => o.value === value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-32 justify-between capitalize">
          {active?.label ?? value}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onSelect={() => onChange(o.value)}
            className="capitalize"
          >
            <Check
              className={cn(
                'size-4',
                o.value === value ? 'opacity-100' : 'opacity-0',
              )}
            />
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function toRow(build: Build, app?: App): Row {
  return {
    id: build.id,
    service: build.app_name,
    project: app ? repoProject(app.repo_url) : build.app_name,
    environment: app?.environment ?? '—',
    server: app?.server_ip ?? '—',
    title: 'Manual deployment',
    status: build.status,
    createdAt: build.created_at,
    build,
  }
}

function repoProject(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\.git$/, '')
    return path.split('/').filter(Boolean).pop() || url
  } catch {
    return url
  }
}
