import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Activity,
  Boxes,
  Check,
  ChevronsUpDown,
  Hammer,
  KeyRound,
  LogOut,
  Plus,
  ScrollText,
  Server,
  Settings,
  Terminal,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { api } from '@/api'
import { errorMessage } from '@/lib/errors'
import { useAuth } from '@/contexts/auth'
import { useTeams } from '@/contexts/teams'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

type NavItem = { title: string; path: string; icon: LucideIcon }

// path is the suffix under /teams/<slug>; Settings is account-level (no slug).
const PLATFORM_NAV: NavItem[] = [
  { title: 'Projects', path: 'projects', icon: Boxes },
  { title: 'Builds', path: 'builds', icon: Hammer },
  { title: 'Servers', path: 'servers', icon: Server },
  { title: 'Monitoring', path: 'monitoring', icon: Activity },
  { title: 'Members', path: 'users', icon: Users },
]

const TEAM_ADMIN_NAV: NavItem[] = [
  { title: 'API Tokens', path: 'tokens', icon: KeyRound },
  { title: 'Audit Log', path: 'audit', icon: ScrollText },
  { title: 'Settings', path: 'settings', icon: Settings },
]

export function AppSidebar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const { activeTeam } = useTeams()
  const slug = activeTeam?.slug
  const home = slug ? `/teams/${slug}/projects` : '/settings'

  // Two-character initials from the email give the footer a stable avatar
  // without pulling an image.
  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {slug && (
          <>
            <NavGroup
              label="Platform"
              items={PLATFORM_NAV}
              slug={slug}
              pathname={pathname}
            />
            <NavGroup
              label="Team"
              items={TEAM_ADMIN_NAV}
              slug={slug}
              pathname={pathname}
            />
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <SidebarMenuButton size="lg">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                    <span className="text-xs font-medium">{initials}</span>
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-medium">{user?.email}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {user?.is_root ? 'root' : user?.role}
                    </span>
                  </div>
                  <LogOut className="ml-auto size-4" />
                </SidebarMenuButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You'll need to sign in again to reach the control plane.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => logout()}>
                    Sign out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

// TeamSwitcher is the tenant picker in the sidebar header: the active team, a
// menu of every team the user belongs to, and a shortcut to create a new one.
function TeamSwitcher() {
  const { teams, activeTeam, switchTeam } = useTeams()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground">
                <span className="text-xs font-semibold">
                  {teamInitials(activeTeam?.name)}
                </span>
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">
                  {activeTeam?.name ?? 'Loading…'}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {activeTeam ? roleLabel(activeTeam.role) : 'team'}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Teams</DropdownMenuLabel>
            {teams.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onSelect={() => switchTeam(t.slug)}
                className="gap-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-muted text-[10px] font-semibold">
                  {teamInitials(t.name)}
                </div>
                <span className="flex-1 truncate">{t.name}</span>
                {t.slug === activeTeam?.slug && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setCreateOpen(true)} className="gap-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <span className="text-muted-foreground">Create new team</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <CreateTeamDialog open={createOpen} onOpenChange={setCreateOpen} />
    </SidebarMenu>
  )
}

// CreateTeamDialog collects a name and creates a team; on success it switches to
// it (which reloads, so every view comes back scoped to the new team). It uses a
// plain Button, not AlertDialogAction, so the modal stays open during the request
// and on error.
function CreateTeamDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { switchTeam } = useTeams()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function create() {
    if (name.trim() === '' || busy) return
    setBusy(true)
    setErr('')
    try {
      const { team } = await api.createTeam(name.trim())
      switchTeam(team.slug)
    } catch (e) {
      setErr(errorMessage(e, 'Could not create the team.'))
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create a team</AlertDialogTitle>
          <AlertDialogDescription>
            A team is an isolated workspace with its own projects, servers, and
            members. You'll be its first admin.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <label htmlFor="team-name" className="text-sm font-medium">
            Team name
          </label>
          <Input
            id="team-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') create()
            }}
            placeholder="Acme Inc"
          />
        </div>
        {err && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button onClick={create} disabled={busy || name.trim() === ''}>
            {busy ? 'Creating…' : 'Create team'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function teamInitials(name?: string): string {
  return (name ?? '?').slice(0, 2).toUpperCase()
}

function roleLabel(role: string): string {
  return role === 'admin' ? 'Admin' : 'Member'
}

// NavGroup renders one labelled section of the sidebar. A link is active when
// the current path matches it exactly or sits under it (e.g. /projects/foo).
function NavGroup({
  label,
  items,
  slug,
  pathname,
}: {
  label: string
  items: NavItem[]
  slug: string
  pathname: string
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const to = `/teams/${slug}/${item.path}`
            const active = pathname === to || pathname.startsWith(to + '/')
            return (
              <SidebarMenuItem key={to}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.title}
                >
                  <Link to={to}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
