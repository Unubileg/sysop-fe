import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '@/api'
import { errorMessage } from '@/lib/errors'
import { Field, InfoCard, Row, Section } from '@/components/settings'
import { useTeams, useTeamSlug } from '@/contexts/teams'
import PageShell from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { formatRelative } from '@/lib/format'

// SETTINGS_TABS are the team-settings sub-pages, shown as a horizontal swiper
// tab bar (matching the project configuration tabs). The active tab rides in the
// URL hash, so a tab is linkable and survives reloads.
const SETTINGS_TABS = [
  { key: 'team-details', label: 'Team details' },
  { key: 'danger-zone', label: 'Danger zone' },
] as const

// Settings is the active team's settings area: a Netlify-style header card, a
// left sub-nav, and anchored sections. Which controls are editable depends on
// the caller's role in the team.
export default function Settings() {
  const { activeTeam } = useTeams()
  const slug = useTeamSlug()
  const { hash } = useLocation()
  const active = hash.slice(1) || SETTINGS_TABS[0].key

  if (!activeTeam) {
    return (
      <PageShell className="max-w-5xl">
        <p className="text-sm text-muted-foreground">No active team.</p>
      </PageShell>
    )
  }

  const isAdmin = activeTeam.role === 'admin'
  return (
    <PageShell className="max-w-5xl">
      <HeaderCard />
      <h1 className="mt-6 text-lg font-semibold tracking-tight">
        General team settings
      </h1>
      <div className="mt-6">
        <SettingsTabs slug={slug} active={active} />
      </div>
      <div className="mt-6 min-w-0">
        {active === 'danger-zone' ? (
          <DangerZone isAdmin={isAdmin} />
        ) : (
          <TeamDetails isAdmin={isAdmin} />
        )}
      </div>
    </PageShell>
  )
}

// HeaderCard is the summary banner: team name, member count, and when it was
// created — mirroring Netlify's "Settings for X's team" block.
function HeaderCard() {
  const { activeTeam } = useTeams()
  const team = activeTeam!
  const [members, setMembers] = useState<number | null>(null)

  useEffect(() => {
    // Any member can read the roster; a failure just hides the count.
    api
      .users()
      .then(({ users }) => setMembers(users.length))
      .catch(() => {})
  }, [])

  const created = new Date(team.created_at)
  const createdLabel = Number.isNaN(created.getTime())
    ? null
    : created.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <h2 className="text-base font-semibold tracking-tight">
        Settings for {team.name}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {members === null
          ? ' '
          : `${members} team member${members === 1 ? '' : 's'}.`}
      </p>
      {createdLabel && (
        <p className="text-sm text-muted-foreground">
          Team created on {createdLabel} ({formatRelative(team.created_at)}).
        </p>
      )}
    </div>
  )
}

// SettingsTabs is the settings primary navigation: a horizontally scrollable
// (swiper) tab bar, matching the project configuration tabs. The active tab
// rides in the URL hash.
function SettingsTabs({ slug, active }: { slug: string; active: string }) {
  const known = SETTINGS_TABS.some((t) => t.key === active)
  return (
    <nav className="flex gap-1 overflow-x-auto scrollbar-none border-b border-border pb-2">
      {SETTINGS_TABS.map((t) => {
        const on = active === t.key || (!known && t.key === SETTINGS_TABS[0].key)
        return (
          <Link
            key={t.key}
            to={`/teams/${slug}/settings#${t.key}`}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              on
                ? 'border-border bg-muted text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

// TeamDetails shows the team's profile (name, slug, id) and, for admins, an
// inline form to rename / re-slug it.
function TeamDetails({ isAdmin }: { isAdmin: boolean }) {
  const { activeTeam, selectTeam } = useTeams()
  const team = activeTeam!
  const [name, setName] = useState(team.name)
  const [slug, setSlug] = useState(team.slug)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const dirty = name.trim() !== team.name || slug.trim() !== team.slug
  const canSave = isAdmin && dirty && name.trim() !== '' && !busy

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setBusy(true)
    setError('')
    try {
      const { team: updated } = await api.updateTeam(name.trim(), slug.trim())
      // The slug may have changed, so re-point the active team and navigate:
      // every view (and the sidebar switcher) reflects the new name/slug.
      selectTeam(updated.slug)
    } catch (err) {
      setError(errorMessage(err, 'Could not save changes.'))
      setBusy(false)
    }
  }

  return (
    <Section id="team-details" title="Team details" description="Your team's profile and information.">
      <InfoCard title="Team information">
        <dl className="divide-y divide-border">
          <Row label="Name">{team.name}</Row>
          <Row label="Slug" mono>
            {team.slug}
          </Row>
          <Row label="Your role">{team.role === 'admin' ? 'Admin' : 'Member'}</Row>
          <Row label="Team ID" mono copy={team.id}>
            {team.id}
          </Row>
        </dl>
      </InfoCard>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-border bg-card p-5"
      >
        <Field label="Team name" htmlFor="team-name">
          <Input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
            placeholder="Acme Inc"
          />
        </Field>
        <Field
          label="URL slug"
          htmlFor="team-slug"
          hint="Lowercase letters, numbers and hyphens. Identifies the team in URLs."
        >
          <Input
            id="team-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={!isAdmin}
            className="font-mono"
            placeholder="acme"
          />
        </Field>
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {isAdmin ? (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!canSave}>
              {busy ? 'Saving…' : 'Edit team information'}
            </Button>
            {dirty && !busy && (
              <span className="text-xs text-muted-foreground">
                You have unsaved changes.
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Only team admins can change these.
          </p>
        )}
      </form>
    </Section>
  )
}

// DangerZone holds the irreversible actions: leaving the team (any member) and
// deleting it (admins, except the default team).
function DangerZone({ isAdmin }: { isAdmin: boolean }) {
  const { activeTeam, teams, selectTeam } = useTeams()
  const team = activeTeam!
  const isDefault = team.slug === 'default'

  // After leaving or deleting the active team, fall back to another membership
  // (empty string lets the root catch-all pick on reload).
  const fallback = () => teams.find((t) => t.slug !== team.slug)?.slug ?? ''

  return (
    <Section
      id="danger-zone"
      title="Danger zone"
      description="Irreversible and destructive actions."
    >
      <div className="overflow-hidden rounded-xl border border-destructive/30">
        <div className="divide-y divide-border">
          <DangerRow
            title="Leave this team"
            desc="You'll lose access to its projects, servers, and members."
            action={
              <Confirm
                label="Leave team"
                title={`Leave ${team.name}?`}
                body="You'll lose access immediately. An admin can invite you back later."
                confirmLabel="Leave team"
                run={async () => {
                  await api.leaveTeam()
                  selectTeam(fallback())
                }}
              />
            }
          />
          {isAdmin && (
            <DangerRow
              title="Delete this team"
              desc={
                isDefault
                  ? 'The default team cannot be deleted.'
                  : 'Permanently delete the team and everything in it.'
              }
              action={
                <Confirm
                  label="Delete team"
                  title={`Delete ${team.name}?`}
                  body="This permanently deletes the team and all of its projects, servers, tokens, and invites. This cannot be undone."
                  confirmLabel="Delete team"
                  disabled={isDefault}
                  run={async () => {
                    await api.deleteTeam()
                    selectTeam(fallback())
                  }}
                />
              }
            />
          )}
        </div>
      </div>
    </Section>
  )
}

function DangerRow({
  title,
  desc,
  action,
}: {
  title: string
  desc: string
  action: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      {action}
    </div>
  )
}

// Confirm is a destructive button guarded by a modal. Its action is expected to
// navigate away on success, so it keeps the modal open and surfaces the error if
// the action throws (e.g. the last admin trying to leave).
function Confirm({
  label,
  title,
  body,
  confirmLabel,
  disabled,
  run,
}: {
  label: string
  title: string
  body: string
  confirmLabel: string
  disabled?: boolean
  run: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function go() {
    setBusy(true)
    setErr('')
    try {
      await run()
    } catch (e) {
      setErr(errorMessage(e, 'Something went wrong.'))
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={disabled}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        {err && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={go} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

