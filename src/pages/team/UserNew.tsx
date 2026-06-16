import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  Copy,
  Shield,
  User as UserIcon,
} from 'lucide-react'
import { api, type Role } from '@/api'
import { errorMessage } from '@/lib/errors'
import { useTeamSlug } from '@/contexts/teams'
import PageShell, { PageHeader } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Minted = { email: string; role: Role; link: string }

// UserNew mints an invite: sysop has no mailer, so an admin sets the email and
// role, the server returns a one-time link, and the admin shares it directly. The
// invitee opens the link and sets their own password — no password is set here.
export default function UserNew() {
  const slug = useTeamSlug()
  const membersHome = `/teams/${slug}/users`
  const [role, setRole] = useState<Role>('member')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Once minted, we show the shareable link instead of the form.
  const [minted, setMinted] = useState<Minted | null>(null)

  const canSubmit = email.includes('@') && !busy

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      const trimmed = email.trim()
      const { token } = await api.createInvite(trimmed, role)
      const link = `${window.location.origin}/accept-invite?token=${token}`
      setMinted({ email: trimmed, role, link })
    } catch (err) {
      setError(
        errorMessage(err, 'Could not create the invite.'),
      )
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setMinted(null)
    setEmail('')
    setRole('member')
    setError('')
  }

  return (
    <PageShell className="max-w-2xl">
      <nav className="mb-4">
        <Link
          to={membersHome}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to members
        </Link>
      </nav>

      {minted ? (
        <InviteReady minted={minted} onAnother={reset} home={membersHome} />
      ) : (
        <>
          <PageHeader
            title="Invite a member"
            description="Set an email and a role. We'll generate a one-time link for you to share — the member sets their own password to join."
          />

          <form onSubmit={submit} className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-sm font-medium">Role</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <RoleCard
                  active={role === 'member'}
                  onClick={() => setRole('member')}
                  icon={<UserIcon className="size-4" />}
                  title="Member"
                  desc="Sign in and use projects, builds, and servers. Cannot manage members."
                />
                <RoleCard
                  active={role === 'admin'}
                  onClick={() => setRole('admin')}
                  icon={<Shield className="size-4" />}
                  title="Admin"
                  desc="Full access, including inviting and removing members."
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-medium">Account</h2>
              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="person@example.com"
                />
              </Field>
            </section>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!canSubmit}>
                {busy ? 'Creating…' : 'Create invite link'}
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link to={membersHome}>Cancel</Link>
              </Button>
            </div>
          </form>
        </>
      )}
    </PageShell>
  )
}

// InviteReady shows the freshly minted link. It is the only time the token is
// visible, so the copy affordance is front and center.
function InviteReady({
  minted,
  onAnother,
  home,
}: {
  minted: Minted
  onAnother: () => void
  home: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(minted.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; the link is selectable in the field regardless.
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invite link ready"
        description={`Share this one-time link with ${minted.email}. They'll join as ${minted.role === 'admin' ? 'an admin' : 'a member'} after setting their own password. The link expires in 7 days.`}
      />

      <div className="space-y-2">
        <label htmlFor="invite-link" className="text-sm font-medium">
          One-time link
        </label>
        <div className="flex gap-2">
          <Input
            id="invite-link"
            readOnly
            value={minted.link}
            onFocus={(e) => e.target.select()}
            className="font-mono text-xs"
          />
          <Button type="button" variant="outline" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          This link won't be shown again. There is no email — send it to the
          member yourself.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={onAnother}>
          Invite another
        </Button>
        <Button asChild>
          <Link to={home}>Back to members</Link>
        </Button>
      </div>
    </div>
  )
}

// RoleCard is one selectable role tile in the form.
function RoleCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors',
        active
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-card hover:bg-muted/50',
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </span>
      <span className="text-sm text-muted-foreground">{desc}</span>
    </button>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
