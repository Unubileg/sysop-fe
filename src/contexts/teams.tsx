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
  selectTeam: (slug: string) => void
  refresh: () => Promise<void>
}

const TeamContext = createContext<TeamState | null>(null)

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
      })
      .finally(() => setLoading(false))
  }, [])

  if (teamSlug && getActiveTeam() !== teamSlug) setActiveTeam(teamSlug)

  const activeTeam = teams.find((t) => t.slug === teamSlug) ?? null

  useEffect(() => {
    if (loading || teams.length === 0) return
    if (teamSlug && !teams.some((t) => t.slug === teamSlug)) {
      const fallback =
        teams.find((t) => t.slug === getActiveTeam()) ?? teams[0]
      navigate(`/teams/${fallback.slug}/projects`, { replace: true })
    }
  }, [loading, teams, teamSlug, navigate])

  const selectTeam = (slug: string) => {
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

export function useTeams() {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error('useTeams must be used within TeamProvider')
  return ctx
}

export function useTeamSlug(): string {
  const { teamSlug } = useParams()
  if (!teamSlug) {
    throw new Error('useTeamSlug must be used inside a /teams/:teamSlug route')
  }
  return teamSlug
}
