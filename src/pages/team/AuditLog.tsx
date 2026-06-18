import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Boxes,
  Check,
  ChevronDown,
  FolderClosed,
  KeyRound,
  List,
  ListFilter,
  LogIn,
  Megaphone,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { api, type AuditEntry } from '@/api'
import { errorMessage } from '@/lib/errors'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatTimestamp } from '@/lib/format'

// Category groups individual events into the filter options. 'all' is the
// catch-all; everything else maps to a closed set of event names.
type Category = 'all' | 'auth' | 'members' | 'tokens' | 'services' | 'projects'
type Sort = 'newest' | 'oldest'

const CATEGORIES: {
  key: Category
  label: string
  icon: LucideIcon
  events?: string[]
}[] = [
  { key: 'all', label: 'All events', icon: List },
  {
    key: 'auth',
    label: 'Sign-in',
    icon: LogIn,
    events: ['login', 'login_failed', 'logout'],
  },
  {
    key: 'members',
    label: 'Member events',
    icon: Users,
    events: ['invite_created', 'invite_revoked', 'invite_accepted', 'user_removed'],
  },
  {
    key: 'tokens',
    label: 'API tokens',
    icon: KeyRound,
    events: ['token_created', 'token_revoked'],
  },
  {
    key: 'services',
    label: 'Services',
    icon: Boxes,
    events: [
      'service_deployed',
      'service_started',
      'service_stopped',
      'service_deleted',
    ],
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: FolderClosed,
    events: ['project_deleted'],
  },
]

const SORTS: { key: Sort; label: string; icon: LucideIcon }[] = [
  { key: 'newest', label: 'Newest', icon: ArrowDownWideNarrow },
  { key: 'oldest', label: 'Oldest', icon: ArrowUpWideNarrow },
]

const PAGE_SIZE = 50

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [loadingMore, setLoadingMore] = useState(false)
  const [exhausted, setExhausted] = useState(false)

  useEffect(() => {
    let alive = true
    setEntries(null)
    setError('')
    setExhausted(false)
    api
      .audit({ limit: PAGE_SIZE })
      .then(({ entries }) => {
        if (!alive) return
        setEntries(entries)
        if (entries.length < PAGE_SIZE) setExhausted(true)
      })
      .catch((err) => {
        if (!alive) return
        setError(errorMessage(err))
      })
    return () => {
      alive = false
    }
  }, [])

  // Filtering is client-side: the page already holds the events and the set is
  // small. Pagination still hits the server for older rows.
  const allowed = useMemo(() => {
    const c = CATEGORIES.find((c) => c.key === category)
    return c?.events ? new Set(c.events) : null
  }, [category])

  const visible = useMemo(() => {
    const list = entries ?? []
    const filtered = allowed ? list.filter((e) => allowed.has(e.event)) : list
    return sort === 'newest' ? filtered : [...filtered].reverse()
  }, [entries, allowed, sort])

  async function loadMore() {
    if (!entries || entries.length === 0 || loadingMore || exhausted) return
    setLoadingMore(true)
    try {
      const before = entries[entries.length - 1].id
      const { entries: more } = await api.audit({ before, limit: PAGE_SIZE })
      setEntries((prev) => (prev ? [...prev, ...more] : more))
      if (more.length < PAGE_SIZE) setExhausted(true)
    } catch {
      // Quiet: a failed load-more shouldn't blow away the page.
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Audit log"
        action={
          <EventsMenu
            category={category}
            sort={sort}
            onCategory={setCategory}
            onSort={setSort}
          />
        }
      />

      {error ? (
        <ErrorState message={error} />
      ) : entries == null ? (
        <LoadingState />
      ) : visible.length === 0 ? (
        <EmptyState filtered={category !== 'all'} />
      ) : (
        <div className="space-y-4">
          <ul className="-mx-3">
            {visible.map((e) => (
              <EventRow key={e.id} entry={e} />
            ))}
          </ul>

          {!exhausted && entries.length > 0 && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load older events'}
              </Button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}

// EventsMenu is the single Netlify-style control in the header: one button whose
// label is the active filter, opening a menu with a "Filter by" group and a
// "Sort by" group. Selecting an item keeps the menu open (preventDefault) so the
// reader can adjust both without reopening.
function EventsMenu({
  category,
  sort,
  onCategory,
  onSort,
}: {
  category: Category
  sort: Sort
  onCategory: (c: Category) => void
  onSort: (s: Sort) => void
}) {
  const [open, setOpen] = useState(false)
  const label = CATEGORIES.find((c) => c.key === category)?.label ?? 'All events'
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ListFilter />
          {label}
          <ChevronDown
            className={cn('transition-transform', open && 'rotate-180')}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filter by</DropdownMenuLabel>
        {CATEGORIES.map((c) => {
          const Icon = c.icon
          return (
            <DropdownMenuItem
              key={c.key}
              onSelect={(e) => {
                e.preventDefault()
                onCategory(c.key)
              }}
            >
              <Icon />
              {c.label}
              {category === c.key && <Check className="ml-auto" />}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        {SORTS.map((s) => {
          const Icon = s.icon
          return (
            <DropdownMenuItem
              key={s.key}
              onSelect={(e) => {
                e.preventDefault()
                onSort(s.key)
              }}
            >
              <Icon />
              {s.label}
              {sort === s.key && <Check className="ml-auto" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// EventRow is one audit entry: a megaphone glyph, a one-line summary of what
// happened, and a muted "by <who> on <when>" line — Netlify's audit row. The
// originating IP is preserved as a hover title rather than shown inline.
function EventRow({ entry }: { entry: AuditEntry }) {
  return (
    <li className="flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50">
      <Megaphone className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          {summarize(entry.event)}
          {entry.target && (
            <>
              {' '}
              <span className="font-medium">{entry.target}</span>
            </>
          )}
        </p>
        <p
          className="mt-0.5 text-sm text-muted-foreground"
          title={entry.ip ? `IP ${entry.ip}` : undefined}
        >
          by {entry.email ?? 'system'} on{' '}
          <time dateTime={entry.created_at}>
            {formatTimestamp(entry.created_at)}
          </time>
        </p>
      </div>
    </li>
  )
}

// Human, event-centric labels for the feed (the actor lives on the "by …" line;
// the resource name, when present, is rendered after the label from
// entry.target).
const EVENT_LABELS: Record<string, string> = {
  login: 'Signed in',
  login_failed: 'Failed sign-in attempt',
  logout: 'Signed out',
  invite_created: 'Invited a new member',
  invite_revoked: 'Revoked a pending invite',
  invite_accepted: 'Accepted an invitation',
  user_removed: 'Removed a member from the team',
  token_created: 'Created an API token',
  token_revoked: 'Revoked an API token',
  service_deployed: 'Deployed service',
  service_started: 'Started service',
  service_stopped: 'Stopped service',
  service_deleted: 'Deleted service',
  project_deleted: 'Deleted project',
}

// summarize labels an event. Unknown events fall back to a humanized form so new
// server-side events read sensibly without a UI change.
function summarize(event: string): string {
  if (event in EVENT_LABELS) return EVENT_LABELS[event]
  const s = event.replace(/[_-]+/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function LoadingState() {
  return (
    <ul className="-mx-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-start gap-3 px-3 py-3">
          <Skeleton className="mt-0.5 size-5 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-80" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
      <p className="text-sm font-medium">
        {filtered ? 'No events in this category' : 'No audit events yet'}
      </p>
      <p className="text-sm text-muted-foreground">
        {filtered
          ? 'Try a different filter.'
          : 'Sign-ins, invites, token changes, and service deletions will appear here.'}
      </p>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-destructive/30 text-center">
      <p className="text-sm font-medium text-destructive">Couldn't load events</p>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
