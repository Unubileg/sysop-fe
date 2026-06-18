import { useMemo, useState } from 'react'
import {
  Boxes,
  ArrowUpDown,
  ChevronDown,
  Check,
  MoreHorizontal,
} from 'lucide-react'
import { api, type DockerContainer } from '@/api'
import { useFetch } from '@/lib/useFetch'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

type ColumnKey = 'name' | 'state' | 'status' | 'image'
const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'state', label: 'State' },
  { key: 'status', label: 'Status' },
  { key: 'image', label: 'Image' },
]

const PAGE_SIZE = 10

export default function Docker() {
  const { data, error, loading } = useFetch(() => api.dockerContainers(), [])
  const rows = useMemo<DockerContainer[]>(() => data ?? [], [data])

  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState<{ key: ColumnKey; dir: 'asc' | 'desc' }>({
    key: 'name',
    dir: 'asc',
  })
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>({
    name: true,
    state: true,
    status: true,
    image: true,
  })
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const list = q
      ? rows.filter((r) => r.name.toLowerCase().includes(q))
      : rows.slice()
    list.sort((a, b) => {
      const cmp = String(a[sort.key]).localeCompare(String(b[sort.key]))
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return list
  }, [rows, filter, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(
    current * PAGE_SIZE,
    current * PAGE_SIZE + PAGE_SIZE,
  )

  function toggleSort(key: ColumnKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    )
  }

  const shownColumns = COLUMNS.filter((c) => visible[c.key])

  return (
    <PageShell>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Boxes className="size-6 text-muted-foreground" />
            Docker Containers
          </span>
        }
        description="See all the containers running on your server."
      />

      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setPage(0)
            }}
            placeholder="Filter by name..."
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columns
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMNS.map((c) => (
                <DropdownMenuItem
                  key={c.key}
                  // Keep the menu open while toggling several columns.
                  onSelect={(e) => {
                    e.preventDefault()
                    setVisible((v) => ({ ...v, [c.key]: !v[c.key] }))
                  }}
                >
                  <Check
                    className={cn(
                      'size-4',
                      visible[c.key] ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {c.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
                  {shownColumns.map((c) => (
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
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {shownColumns.map((c) => (
                        <td key={c.key} className="px-4 py-4">
                          <Skeleton className="h-4 w-32" />
                        </td>
                      ))}
                      <td className="px-4 py-4" />
                    </tr>
                  ))
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={shownColumns.length + 1}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No containers found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                    >
                      {visible.name && (
                        <td className="max-w-xs break-all px-4 py-3 font-medium">
                          {row.name}
                        </td>
                      )}
                      {visible.state && (
                        <td className="px-4 py-3">
                          <StatePill state={row.state} />
                        </td>
                      )}
                      {visible.status && (
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.status}
                        </td>
                      )}
                      {visible.image && (
                        <td className="max-w-md break-all px-4 py-3 font-mono text-xs">
                          {row.image}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <RowActions row={row} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
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
    </PageShell>
  )
}

// StatePill renders the container state as a coloured pill (running = green).
function StatePill({ state }: { state: string }) {
  const tone =
    state === 'running'
      ? 'bg-emerald-500'
      : state === 'paused' || state === 'created' || state === 'restarting'
        ? 'bg-amber-500'
        : state === 'exited' || state === 'dead'
          ? 'bg-red-500'
          : 'bg-muted-foreground'
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-medium capitalize">
      <span className={cn('size-2 rounded-full', tone)} />
      {state}
    </span>
  )
}

function RowActions({ row }: { row: DockerContainer }) {
  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast(`${label} copied`)
    } catch {
      toast('Could not copy', 'error')
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Container actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => copy('Container ID', row.id)}>
          Copy ID
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copy('Image', row.image)}>
          Copy image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
