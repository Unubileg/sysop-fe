// Minimal typed client for the control-plane API. Every request carries the
// session cookie (credentials:'include'); the server sets/clears sysop_session.
const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'

// Role is the account's permission tier. The backend enforces one difference
// today: admins may manage members, members may not.
export type Role = 'admin' | 'member'

// User mirrors auth.User on the backend (json tags). gitlab_id is omitted when
// the account is not linked to GitLab.
export type User = {
  id: string
  email: string
  role: string
  is_root: boolean
  gitlab_id?: number
  created_at: string
}

// Team mirrors auth.Team: a tenant plus the caller's role within it. The active
// team's slug rides on every request as the X-Sysop-Team header (see setActiveTeam).
export type Team = {
  id: string
  slug: string
  name: string
  role: Role
  created_at: string
}

// Invite mirrors auth.Invite: a pending membership an admin created. The holder of
// the one-time link sets their own password to accept; accepted_at is omitted
// while it is still pending. team_name names the team they're joining.
export type Invite = {
  id: string
  email: string
  role: string
  team_name?: string
  expires_at: string
  accepted_at?: string
  created_at: string
}

// Build mirrors a /api/builds row: one CI build of an application. duration_ms
// is null while the build is still running; log_output holds the captured log.
export type Build = {
  id: string
  app_name: string
  commit_hash: string
  image_tag: string
  status: string
  created_at: string
  log_output: string
  duration_ms: number | null
}

// App mirrors a /api/apps row: a deployable application. server_id/server_ip/
// port are null until it lands on a server. env_variables/volume_mappings are
// free-form JSON we don't introspect here. status is the row's own state
// ('active'); the live deploy outcome comes from its latest Build.
export type App = {
  id: string
  name: string
  repo_url: string
  branch: string
  server_id: string | null
  server_ip: string | null
  port: number | null
  env_variables: unknown
  volume_mappings: unknown
  environment: string
  // Deploy toggles, surfaced in the General tab's Deploy Settings panel.
  // autodeploy gates webhook auto-builds; clean_cache makes builds run --no-cache.
  autodeploy: boolean
  clean_cache: boolean
  status: string
  created_at: string
}

// Server mirrors a /api/servers row: a machine running sysopd that apps deploy
// onto. The new-project form lists these so a project can pick where it lands.
export type Server = {
  id: string
  name: string
  ip_address: string
  status: string
}

// AppDomain mirrors api.AppDomain: an explicit hostname routed by the gateway
// straight to an app, without parsing the app name out of the subdomain.
export type AppDomain = {
  id: string
  application_id: string
  domain: string
  created_at: string
}

// AuditEntry mirrors api.AuditEntry: one row of the audit log, joined with the
// actor's email when the user still exists (NULL after user deletion).
export type AuditEntry = {
  id: number
  user_id?: string
  email?: string
  event: string
  ip: string
  created_at: string
}

// PublicConfig describes how the gateway routes, so the dashboard can show an
// app's canonical URL the same way the gateway serves it. base_domain is the
// suffix for default "<app>.<base>" subdomains (empty in dev); tls picks the
// scheme (https when Let's Encrypt is on).
export type PublicConfig = {
  base_domain: string
  tls: boolean
}

// ServerMetrics is a live resource snapshot of the server an app runs on,
// rendered by the monitoring dashboard. All sizes are raw bytes; the block/
// network counters are cumulative since the host booted.
export type ServerMetrics = {
  cpu_percent: number
  memory_used_bytes: number
  memory_total_bytes: number
  disk_used_bytes: number
  disk_total_bytes: number
  docker_images_bytes: number
  docker_containers_bytes: number
  docker_volumes_bytes: number
  docker_build_cache_bytes: number
  block_read_bytes: number
  block_write_bytes: number
  network_rx_bytes: number
  network_tx_bytes: number
}

// ApiError carries the HTTP status so callers can branch on 401/403/429.
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

// The active team's slug is sent on every request as X-Sysop-Team so the server
// scopes data to it. It is persisted so a reload keeps the same team; the team
// context (teams.tsx) owns it and calls setActiveTeam on switch.
const TEAM_KEY = 'sysop_team'
let activeTeamSlug = localStorage.getItem(TEAM_KEY) ?? ''

export function setActiveTeam(slug: string) {
  activeTeamSlug = slug
  if (slug) localStorage.setItem(TEAM_KEY, slug)
  else localStorage.removeItem(TEAM_KEY)
}

export function getActiveTeam(): string {
  return activeTeamSlug
}

// request issues a JSON call and throws ApiError on any non-2xx. The backend
// always replies with a JSON {"error": ...} envelope on failure.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(activeTeamSlug ? { 'X-Sysop-Team': activeTeamSlug } : {}),
      ...init?.headers,
    },
  })
  const text = await res.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : undefined
  } catch {
    // A non-JSON error body (e.g. a plain-text 404 from the mux) shouldn't blow
    // up as a SyntaxError here; fall back to the raw text as the message below.
    body = undefined
  }
  if (!res.ok) {
    const err = (body as { error?: string } | undefined)?.error
    throw new ApiError(res.status, err ?? text ?? res.statusText)
  }
  return body as T
}

export const api = {
  // Public gateway config — base domain and TLS, for rendering canonical URLs.
  config: () => request<PublicConfig>('/api/config'),
  login: (email: string, password: string) =>
    request<{ user: User }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>('/api/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/api/me'),
  // Teams the caller belongs to / creating one (they become its first admin).
  teams: () => request<{ teams: Team[] }>('/api/teams'),
  createTeam: (name: string, slug?: string) =>
    request<{ team: Team }>('/api/teams', {
      method: 'POST',
      body: JSON.stringify(slug ? { name, slug } : { name }),
    }),
  updateTeam: (name: string, slug?: string) =>
    request<{ team: Team }>('/api/teams/update', {
      method: 'POST',
      body: JSON.stringify(slug ? { name, slug } : { name }),
    }),
  deleteTeam: () =>
    request<void>('/api/teams/delete', { method: 'POST' }),
  leaveTeam: () =>
    request<void>('/api/teams/leave', { method: 'POST' }),
  apps: () => request<App[]>('/api/apps'),
  // Create a project (the backend rejects a duplicate name with 409). Env vars
  // and volumes are configured later, so they start empty.
  createApp: (input: {
    name: string
    repo_url: string
    branch: string
    server_id: string | null
    environment: string
  }) =>
    request<{ success: boolean }>('/api/apps', {
      method: 'POST',
      body: JSON.stringify({ ...input, env_variables: [], volume_mappings: [] }),
    }),
  // Deploy actions — all keyed by app name, all need the deploy ability.
  // deploy/rebuild queue a build (rebuild forces --no-cache); reload restarts the
  // running container in place; start/stop toggle a stopped/running container.
  deployApp: (appName: string) =>
    request<{ success: boolean; message: string }>('/api/apps/deploy', {
      method: 'POST',
      body: JSON.stringify({ app_name: appName }),
    }),
  rebuildApp: (appName: string) =>
    request<{ success: boolean; message: string }>('/api/apps/rebuild', {
      method: 'POST',
      body: JSON.stringify({ app_name: appName }),
    }),
  reloadApp: (appName: string) =>
    request<{ success: boolean }>('/api/apps/reload', {
      method: 'POST',
      body: JSON.stringify({ app_name: appName }),
    }),
  startApp: (appName: string) =>
    request<{ success: boolean }>('/api/apps/start', {
      method: 'POST',
      body: JSON.stringify({ app_name: appName }),
    }),
  stopApp: (appName: string) =>
    request<{ success: boolean }>('/api/apps/stop', {
      method: 'POST',
      body: JSON.stringify({ app_name: appName }),
    }),
  // Update the per-app deploy toggles. Omitted fields are left unchanged.
  updateAppSettings: (
    appName: string,
    settings: { autodeploy?: boolean; clean_cache?: boolean },
  ) =>
    request<{ success: boolean }>('/api/apps/settings', {
      method: 'POST',
      body: JSON.stringify({ app_name: appName, ...settings }),
    }),
  servers: () => request<Server[]>('/api/servers'),
  builds: () => request<Build[]>('/api/builds'),
  // User management — admin-only on the server (403 otherwise).
  users: () => request<{ users: User[] }>('/api/users'),
  deleteUser: (id: string) =>
    request<void>('/api/users/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
  setMemberRole: (id: string, role: Role) =>
    request<void>('/api/users/role', {
      method: 'POST',
      body: JSON.stringify({ id, role }),
    }),
  // Invites — an admin mints a one-time link (the token is returned once); the
  // invitee accepts it themselves on the public accept page.
  invites: () => request<{ invites: Invite[] }>('/api/users/invites'),
  createInvite: (email: string, role: Role) =>
    request<{ invite: Invite; token: string }>('/api/users/invites', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  deleteInvite: (id: string) =>
    request<void>('/api/users/invites/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
  // Public, token-authenticated — used by the accept-invite page before login.
  lookupInvite: (token: string) =>
    request<{ invite: Invite }>('/api/invite/lookup', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  // Audit log — admins see all events, members see only their own. Pagination
  // is by `before` (an entry id strictly less than which to return).
  audit: (opts: { event?: string; before?: number; limit?: number } = {}) => {
    const q = new URLSearchParams()
    if (opts.event) q.set('event', opts.event)
    if (opts.before) q.set('before', String(opts.before))
    if (opts.limit) q.set('limit', String(opts.limit))
    const qs = q.toString()
    return request<{ entries: AuditEntry[] }>('/api/audit' + (qs ? '?' + qs : ''))
  },
  // Live resource snapshot of one server (monitoring page).
  serverMetrics: (serverId: string) =>
    request<ServerMetrics>(
      '/api/servers/metrics?server_id=' + encodeURIComponent(serverId),
    ),
  // Custom domains attached to an app — gateway routes Host header straight to
  // the app, bypassing the default "<app>.<base>" subdomain pattern.
  appDomains: (appId: string) =>
    request<{ domains: AppDomain[] }>(
      '/api/apps/domains?app_id=' + encodeURIComponent(appId),
    ),
  createAppDomain: (appId: string, domain: string) =>
    request<{ domain: AppDomain }>('/api/apps/domains', {
      method: 'POST',
      body: JSON.stringify({ app_id: appId, domain }),
    }),
  deleteAppDomain: (id: string) =>
    request<void>('/api/apps/domains/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
  acceptInvite: (token: string, password: string) =>
    request<{ user: User }>('/api/invite/accept', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
}
