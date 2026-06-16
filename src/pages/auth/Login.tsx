import { useState, type FormEvent } from 'react'
import { Terminal } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { ApiError } from '@/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      // On success the user is set in context and App swaps to the shell,
      // unmounting this form — so we leave `busy` true.
      await login(email, password)
    } catch (err) {
      setError(messageFor(err))
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Terminal className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">sysop</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to the control plane
            </p>
          </div>
        </div>

        <Card>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sysop.local"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={busy} className="w-full">
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// messageFor turns a thrown error into a friendly line for the form.
function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return 'Too many attempts. Try again in a minute.'
    if (err.status === 401) return 'Invalid email or password.'
    return err.message
  }
  return 'Cannot reach the server. Is the control-plane running?'
}
