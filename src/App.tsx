import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/auth'
import { getActiveTeam } from './api'
import { TeamProvider, useTeams } from '@/contexts/teams'
import Login from './pages/auth/Login'
import AcceptInvite from './pages/auth/AcceptInvite'
import Projects from './pages/projects/Projects'
import ProjectNew from './pages/projects/ProjectNew'
import ProjectServices from './pages/projects/ProjectServices'
import ProjectDetail from './pages/projects/ProjectDetail'
import Builds from './pages/builds/Builds'
import BuildDetails from './pages/builds/BuildDetails'
import Servers from './pages/Servers'
import Docker from './pages/Docker'
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

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route element={user ? <Shell /> : <Login />}>
        <Route path="/teams/:teamSlug">
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectId" element={<ProjectServices />} />
          <Route path="services/new" element={<ProjectNew />} />
          <Route path="services/:name" element={<ProjectDetail />} />
          <Route path="services/:name/:section" element={<ProjectDetail />} />
          <Route
            path="services/:name/:section/:tab"
            element={<ProjectDetail />}
          />
          <Route path="builds" element={<Builds />} />
          <Route path="builds/:id" element={<BuildDetails />} />
          <Route path="servers" element={<Servers />} />
          <Route path="docker" element={<Docker />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="tokens" element={<Tokens />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="users" element={<Users />} />
          <Route path="users/new" element={<UserNew />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<TeamFallback />} />
      </Route>
    </Routes>
  )
}

function TeamFallback() {
  const { teams, loading } = useTeams()
  if (loading) return null
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

function TeamScopedOutlet() {
  const { teamSlug } = useParams()
  return <Outlet key={teamSlug} />
}

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
              <TeamScopedOutlet />
            </div>
          </SidebarInset>
          <Toaster />
        </SidebarProvider>
      </TooltipProvider>
    </TeamProvider>
  )
}
