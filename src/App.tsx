import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/contexts/auth'
import { getActiveTeam } from './api'
import { TeamProvider, useTeams } from '@/contexts/teams'
import Login from './pages/auth/Login'
import AcceptInvite from './pages/auth/AcceptInvite'
import Projects from './pages/projects/Projects'
import ProjectNew from './pages/projects/ProjectNew'
import ProjectDetail from './pages/projects/ProjectDetail'
import Builds from './pages/builds/Builds'
import BuildDetails from './pages/builds/BuildDetails'
import Servers from './pages/Servers'
import Monitoring from './pages/Monitoring'
import Tokens from './pages/team/Tokens'
import AuditLog from './pages/team/AuditLog'
import Users from './pages/team/Users'
import UserNew from './pages/team/UserNew'
import Settings from './pages/team/Settings'
import { AppSidebar } from './components/layout/AppSidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toast'

export default function App() {
  const { user, loading } = useAuth()

  // While we ask the server who we are, show a spinner instead of flashing the
  // login screen for a logged-in user.
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  // /accept-invite is public — the token in its URL is the credential, so it must
  // render whether or not anyone is signed in. Every other route sits behind the
  // app shell when authenticated, and falls back to the login screen otherwise.
  return (
    <Routes>
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route element={user ? <Shell /> : <Login />}>
        {/* Every page is team-scoped: the active team's slug rides in the URL
            so a link is self-describing and survives team switches in other
            tabs. TeamProvider syncs the api-client header off the slug and
            redirects when the slug isn't one of the caller's teams. */}
        <Route path="/teams/:teamSlug">
          <Route path="projects" element={<Projects />} />
          <Route path="projects/new" element={<ProjectNew />} />
          <Route path="projects/:name" element={<ProjectDetail />} />
          <Route path="projects/:name/:section" element={<ProjectDetail />} />
          <Route
            path="projects/:name/:section/:tab"
            element={<ProjectDetail />}
          />
          <Route path="builds" element={<Builds />} />
          <Route path="builds/:id" element={<BuildDetails />} />
          <Route path="servers" element={<Servers />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="tokens" element={<Tokens />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="users" element={<Users />} />
          <Route path="users/new" element={<UserNew />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        {/* Catch-all forwards to the active team's projects page. */}
        <Route path="*" element={<TeamFallback />} />
      </Route>
    </Routes>
  )
}

// TeamFallback rewrites any path that doesn't match a known route (including the
// root) to the active team's projects page. It exists because the authenticated
// shell can't render team-scoped chrome until a slug is in the URL.
function TeamFallback() {
  const { teams, loading } = useTeams()
  if (loading) return null
  // Prefer the last-used team (api client tracks it); else the first membership.
  const target = teams.find((t) => t.slug === getActiveTeam()) ?? teams[0]
  if (!target) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6 text-center text-sm text-muted-foreground">
        You don't belong to any team yet.
      </div>
    )
  }
  return <Navigate to={`/teams/${target.slug}/projects`} replace />
}

// Shell is the authenticated layout: sidebar, header, and the routed page in the
// Outlet. Rendered only when a user is present.
function Shell() {
  return (
    <TeamProvider>
      <TooltipProvider delayDuration={0}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="min-w-0">
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
              <SidebarTrigger />
            </header>
            <div className="flex-1 overflow-auto">
              <Outlet />
            </div>
          </SidebarInset>
          <Toaster />
        </SidebarProvider>
      </TooltipProvider>
    </TeamProvider>
  )
}
