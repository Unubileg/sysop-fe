import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Terminal } from 'lucide-react'
import { api, ApiError, type Invite } from '@/api'
import { errorMessage } from '@/lib/errors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// AcceptInvite is the public landing for an invite link (/accept-invite?token=…).
// It is rendered outside the authenticated app: the token in the URL is the only
// credential. We look the invite up to show who it is for, then let the holder set
// their own password — on success the server logs them straight in.
export default function AcceptInvite() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [invite, setInvite] = useState<Invite | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setLoadError('This invite link is missing its token.')
      setLoading(false)
      return
    }
    let alive = true
    api
      .lookupInvite(token)
      .then(({ invite }) => {
        if (alive) setInvite(invite)
      })
      .catch((err) => {
        if (!alive) return
        setLoadError(
          err instanceof ApiError
            ? err.message
            : 'Cannot reach the server. Is the control-plane running?',
        )
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [token])

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Brand />
        <Card>
          <CardContent>
            {loading ? (
              <LoadingPanel />
            ) : invite ? (
              <AcceptForm token={token} invite={invite} />
            ) : (
              <InvalidPanel message={loadError} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="mb-6 flex flex-col items-center gap-2 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Terminal className="size-5" />
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">sysop</h1>
        <p className="text-sm text-muted-foreground">Accept your invitation</p>
      </div>
    </div>
  )
}

// AcceptForm sets the new account's password. On success the server has issued a
// session cookie, so a full navigation re-runs AuthProvider's bootstrap and lands
// the newcomer inside the app already signed in.
function AcceptForm({ token, invite }: { token: string; invite: Invite }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const tooShort = password.length > 0 && password.length < 8
  const mismatch = confirm.length > 0 && confirm !== password
  const canSubmit = password.length >= 8 && confirm === password && !busy

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      await api.acceptInvite(token, password)
      // No active team is set yet; the root catch-all routes us to the user's
      // first membership's projects page.
      window.location.href = '/'
    } catch (err) {
      setError(
        errorMessage(err, 'Could not accept the invite.'),
      )
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-sm text-muted-foreground">You're joining as</p>
        <p className="font-medium break-all">{invite.email}</p>
        <Badge variant={invite.role === 'admin' ? 'default' : 'secondary'}>
          {invite.role === 'admin' ? 'Admin' : 'Member'}
        </Badge>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        {tooShort && (
          <p className="text-xs text-destructive">
            Use at least 8 characters.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="text-sm font-medium">
          Confirm password
        </label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter the password"
        />
        {mismatch && (
          <p className="text-xs text-destructive">Passwords don't match.</p>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {busy ? 'Setting up…' : 'Set password & join'}
      </Button>
    </form>
  )
}

function LoadingPanel() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}

function InvalidPanel({ message }: { message: string }) {
  return (
    <div className="space-y-4 text-center">
      <div className="space-y-1">
        <p className="text-sm font-medium">This invite can't be used</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Button asChild variant="outline" className="w-full">
        <Link to="/">Go to sign in</Link>
      </Button>
    </div>
  )
}
