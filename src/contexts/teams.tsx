import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, getActiveTeam, setActiveTeam, type Team } from '@/api'

type TeamState = {
  teams: Team[]
  activeTeam: Team | null
  loading: boolean
  switchTeam: (slug: string) => void
  // selectTeam navigates unconditionally — use after rename/delete/leave.
  selectTeam: (slug: string) => void
  refresh: () => Promise<void>
}

const TeamContext = createContext<TeamState | null>(null)

// TeamProvider loads the teams the signed-in user belongs to and treats the
// :teamSlug param in the URL as the source of truth for the active team. The
// slug is also forwarded on every API request via X-Sysop-Team so the server
// scopes data the same way. localStorage is just a hint for the initial
// redirect (catch-all → /teams/<last>/projects); the URL wins after that.
export function TeamProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { teamSlug } = useParams()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .teams()
      .then(({ teams }) => setTeams(teams))
      .catch(() => {
        // A failure here (no teams, server down) leaves the list empty; the app
        // still renders and the switcher simply shows nothing to switch to.
      })
      .finally(() => setLoading(false))
  }, [])

  // The active team is whichever URL slug matches a membership. URL outranks
  // localStorage so a deep link "/teams/<other>/..." swaps teams on navigation.
  const activeTeam =
    teams.find((t) => t.slug === teamSlug) ?? null

  useEffect(() => {
    if (activeTeam) setActiveTeam(activeTeam.slug)
  }, [activeTeam])

  // If the URL points at a team we don't belong to, redirect to the last team
  // we used (or our first membership) so deep links degrade gracefully.
  useEffect(() => {
    if (loading || teams.length === 0) return
    if (teamSlug && !teams.some((t) => t.slug === teamSlug)) {
      const fallback =
        teams.find((t) => t.slug === getActiveTeam()) ?? teams[0]
      navigate(`/teams/${fallback.slug}/projects`, { replace: true })
    }
  }, [loading, teams, teamSlug, navigate])

  const selectTeam = (slug: string) => {
    // No slug means "no team to go to" — the leave/delete fallback when the user
    // has no other membership. The root catch-all renders a "no team" state.
    navigate(slug ? `/teams/${slug}/projects` : '/')
  }
  const switchTeam = (slug: string) => {
    if (slug === activeTeam?.slug) return
    selectTeam(slug)
  }

  const refresh = async () => {
    const { teams } = await api.teams()
    setTeams(teams)
  }

  return (
    <TeamContext.Provider
      value={{ teams, activeTeam, loading, switchTeam, selectTeam, refresh }}
    >
      {children}
    </TeamContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTeams() {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error('useTeams must be used within TeamProvider')
  return ctx
}

// useTeamSlug returns the active team's slug for prefixing links. It throws
// when called outside a team-scoped route — by design: a team-less page
// (Settings, Login) has no slug to spell into a link.
// eslint-disable-next-line react-refresh/only-export-components
export function useTeamSlug(): string {
  const { teamSlug } = useParams()
  if (!teamSlug) {
    throw new Error('useTeamSlug must be used inside a /teams/:teamSlug route')
  }
  return teamSlug
}
