import { useState } from 'react'
import { Mail } from 'lucide-react'
import { api, type Invite } from '@/api'
import { errorMessage } from '@/lib/errors'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatRelative } from '@/lib/format'

// PendingInvites lists outstanding invite links. It renders nothing until at
// least one invite is awaiting acceptance.
export function PendingInvites({
  invites,
  onRevoked,
}: {
  invites: Invite[]
  onRevoked: (id: string) => void
}) {
  if (invites.length === 0) return null
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium">Pending invites</h2>
        <Badge variant="secondary">{invites.length}</Badge>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {invites.map((inv) => (
          <InviteRow key={inv.id} invite={inv} onRevoked={onRevoked} />
        ))}
      </ul>
    </div>
  )
}

// InviteRow is one outstanding invite, with a Cancel action that revokes the link
// so it can no longer be used.
function InviteRow({
  invite,
  onRevoked,
}: {
  invite: Invite
  onRevoked: (id: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function cancel() {
    setBusy(true)
    setErr('')
    try {
      await api.deleteInvite(invite.id)
      onRevoked(invite.id)
    } catch (e) {
      setErr(errorMessage(e, 'Could not cancel the invite.'))
      setBusy(false)
    }
  }

  return (
    <li className="flex items-center gap-4 bg-card px-4 py-4 transition-colors hover:bg-muted/50">
      <Avatar>
        <AvatarFallback>
          <Mail className="size-4 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium">{invite.email}</span>
          {invite.role === 'admin' ? (
            <Badge>Admin</Badge>
          ) : (
            <Badge variant="secondary">Member</Badge>
          )}
          <Badge variant="outline">Pending</Badge>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {err ? (
            <span className="text-destructive">{err}</span>
          ) : (
            `Invited ${formatRelative(invite.created_at)} · Expires ${formatRelative(invite.expires_at)}`
          )}
        </p>
      </div>

      <Button variant="ghost" size="sm" onClick={cancel} disabled={busy}>
        {busy ? 'Canceling…' : 'Cancel'}
      </Button>
    </li>
  )
}
