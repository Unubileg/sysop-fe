import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus } from 'lucide-react'
import { api, type Invite, type User } from '@/api'
import { errorMessage } from '@/lib/errors'
import { MemberRow } from '@/components/team/MemberRow'
import { PendingInvites } from '@/components/team/PendingInvites'
import { useAuth } from '@/contexts/auth'
import { useTeams, useTeamSlug } from '@/contexts/teams'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type RoleFilterValue = 'all' | 'admin' | 'member'

export default function Users() {
  const { user: me } = useAuth()
  const { activeTeam } = useTeams()
  const slug = useTeamSlug()
  // Any member can read the roster; only team admins see the manage actions.
  const isAdmin = activeTeam?.role === 'admin'
  const [users, setUsers] = useState<User[] | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>('all')

  useEffect(() => {
    let alive = true
    api
      .users()
      .then(({ users }) => {
        if (alive) setUsers(users)
      })
      .catch((err) => {
        if (!alive) return
        setError(errorMessage(err))
      })
    // Pending invites are secondary: the users call above already surfaces an
    // auth or connection error, so a failure here is left silent.
    api
      .invites()
      .then(({ invites }) => {
        if (alive) setInvites(invites)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // Optimistic local updates: reflect a remove/role-change/revoke in the list
  // without a refetch (the mutation already succeeded on the server).
  const onRemoved = (id: string) =>
    setUsers((prev) => prev?.filter((u) => u.id !== id) ?? prev)

  const onRoleChanged = (id: string, role: string) =>
    setUsers((prev) =>
      prev?.map((u) => (u.id === id ? { ...u, role } : u)) ?? prev,
    )

  const onInviteRevoked = (id: string) =>
    setInvites((prev) => prev.filter((i) => i.id !== id))

  const visible = useMemo(() => {
    const list = users ?? []
    const q = query.trim().toLowerCase()
    return list.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      return q === '' || u.email.toLowerCase().includes(q)
    })
  }, [users, query, roleFilter])

  return (
    <PageShell>
      <PageHeader
        title="Members"
        description="People who can sign in to this control plane."
        action={
          isAdmin ? (
            <Button asChild>
              <Link to={`/teams/${slug}/users/new`}>
                <UserPlus />
                Invite member
              </Link>
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <ErrorState message={error} />
      ) : users == null ? (
        <LoadingState />
      ) : (
        <div className="space-y-6">
          <Stats users={users} />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by email"
                  className="pl-9"
                />
              </div>
              <RoleFilter value={roleFilter} onChange={setRoleFilter} />
            </div>

            {visible.length === 0 ? (
              <EmptyState
                searching={query.trim() !== '' || roleFilter !== 'all'}
              />
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {visible.map((u) => (
                  <MemberRow
                    key={u.id}
                    user={u}
                    isSelf={u.id === me?.id}
                    isAdmin={isAdmin}
                    onRemoved={onRemoved}
                    onRoleChanged={onRoleChanged}
                  />
                ))}
              </ul>
            )}
          </div>

          <PendingInvites invites={invites} onRevoked={onInviteRevoked} />
        </div>
      )}
    </PageShell>
  )
}

function Stats({ users }: { users: User[] }) {
  const admins = users.filter((u) => u.role === 'admin').length
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="Team members" value={users.length} sub="with access" />
      <StatCard label="Admins" value={admins} sub="manage members" />
      <StatCard
        label="Members"
        value={users.length - admins}
        sub="standard access"
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: ReactNode
  sub: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function RoleFilter({
  value,
  onChange,
}: {
  value: RoleFilterValue
  onChange: (v: RoleFilterValue) => void
}) {
  const opts: { key: RoleFilterValue; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'admin', label: 'Admins' },
    { key: 'member', label: 'Members' },
  ]
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            'rounded-md px-3 py-1 text-sm transition-colors',
            value === o.key
              ? 'bg-muted font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] rounded-xl" />
        ))}
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 bg-card px-4 py-4">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="size-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
      <p className="text-sm font-medium">
        {searching ? 'No matching members' : 'No members yet'}
      </p>
      <p className="text-sm text-muted-foreground">
        {searching
          ? 'Try a different email or role.'
          : 'Invite a member to grant access.'}
      </p>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-destructive/30 text-center">
      <p className="text-sm font-medium text-destructive">
        Couldn't load members
      </p>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
