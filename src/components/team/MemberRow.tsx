import { useState, type ReactNode } from 'react'
import { MoreHorizontal, Shield } from 'lucide-react'
import { api, type Role, type User } from '@/api'
import { errorMessage } from '@/lib/errors'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { formatDateTime, formatRelative } from '@/lib/format'

export function MemberRow({
  user,
  isSelf,
  isAdmin,
  onRemoved,
  onRoleChanged,
}: {
  user: User
  isSelf: boolean
  isAdmin: boolean
  onRemoved: (id: string) => void
  onRoleChanged: (id: string, role: string) => void
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [roleErr, setRoleErr] = useState('')
  const removable = isAdmin && !user.is_root && !isSelf

  async function changeRole(role: Role) {
    setRoleErr('')
    try {
      await api.setMemberRole(user.id, role)
      onRoleChanged(user.id, role)
    } catch (e) {
      setRoleErr(errorMessage(e, 'Could not change the role.'))
    }
  }

  return (
    <li className="flex items-center gap-4 bg-card px-4 py-4 transition-colors hover:bg-muted/50">
      <Avatar>
        <AvatarFallback>{initials(user.email)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium">{user.email}</span>
          <RoleBadge user={user} />
          {isSelf && <Badge variant="outline">You</Badge>}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {roleErr ? (
            <span className="text-destructive">{roleErr}</span>
          ) : (
            <>
              Joined {formatRelative(user.created_at)}
              {user.gitlab_id != null && ' · GitLab-linked'}
            </>
          )}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Member options">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDetailsOpen(true)}>
            View details
          </DropdownMenuItem>
          {isAdmin && !isSelf && (
            <DropdownMenuItem
              onSelect={() =>
                changeRole(user.role === 'admin' ? 'member' : 'admin')
              }
            >
              {user.role === 'admin' ? 'Change to member' : 'Make admin'}
            </DropdownMenuItem>
          )}
          {removable && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setRemoveOpen(true)}
              >
                Remove from team
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DetailsDialog
        user={user}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      <RemoveDialog
        user={user}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        onRemoved={onRemoved}
      />
    </li>
  )
}

function RoleBadge({ user }: { user: User }) {
  if (user.is_root)
    return (
      <Badge variant="outline" className="gap-1">
        <Shield className="size-3" />
        Root admin
      </Badge>
    )
  if (user.role === 'admin') return <Badge>Admin</Badge>
  return <Badge variant="secondary">Member</Badge>
}

function DetailsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback>{initials(user.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <AlertDialogTitle className="truncate">
                {user.email}
              </AlertDialogTitle>
              <AlertDialogDescription>Member details</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <DetailField label="Role">{roleLabel(user)}</DetailField>
          <DetailField label="Joined">
            {formatDateTime(user.created_at)}
          </DetailField>
          <DetailField label="GitLab">
            {user.gitlab_id != null ? `Linked (#${user.gitlab_id})` : 'Not linked'}
          </DetailField>
          <DetailField label="User ID" mono>
            {user.id}
          </DetailField>
        </dl>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DetailField({
  label,
  mono,
  children,
}: {
  label: string
  mono?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm break-all', mono && 'font-mono text-xs')}>
        {children}
      </dd>
    </div>
  )
}

function RemoveDialog({
  user,
  open,
  onOpenChange,
  onRemoved,
}: {
  user: User
  open: boolean
  onOpenChange: (v: boolean) => void
  onRemoved: (id: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function remove() {
    setBusy(true)
    setErr('')
    try {
      await api.deleteUser(user.id)
      onRemoved(user.id)
      onOpenChange(false)
    } catch (e) {
      setErr(errorMessage(e, 'Could not remove the member.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {user.email}?</AlertDialogTitle>
          <AlertDialogDescription>
            They lose access immediately; their sessions and API tokens are
            revoked. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {err && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={remove} disabled={busy}>
            {busy ? 'Removing…' : 'Remove member'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase()
}

function roleLabel(user: User): string {
  if (user.is_root) return 'Root admin'
  return user.role === 'admin' ? 'Admin' : 'Member'
}
