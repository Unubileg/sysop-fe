export const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'
export type Role = 'admin' | 'member'

export type User = {
  id: string
  email: string
  role: string
  is_root: boolean
  gitlab_id?: number
  created_at: string
}

export type Team = {
  id: string
  slug: string
  name: string
  role: Role
  created_at: string
}

export type Invite = {
  id: string
  email: string
  role: string
  team_name?: string
  expires_at: string
  accepted_at?: string
  created_at: string
}

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

export type Project = {
  id: string
  name: string
  description: string
  created_at: string
  service_count: number
}

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
  project_id: string | null
  autodeploy: boolean
  clean_cache: boolean
  webhook_secret: string
  status: string
  created_at: string
  deploy_status: string | null
}

export type Server = {
  id: string
  name: string
  ip_address: string
  status: string
}

export type AppDomain = {
  id: string
  application_id: string
  domain: string
  created_at: string
}

export type AuditEntry = {
  id: number
  user_id?: string
  email?: string
  event: string
  target?: string
  ip: string
  created_at: string
}

export type PublicConfig = {
  base_domain: string
  tls: boolean
}

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

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

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
    body = undefined
  }
  if (!res.ok) {
    const err = (body as { error?: string } | undefined)?.error
    throw new ApiError(res.status, err ?? text ?? res.statusText)
  }
  return body as T
}

export type DockerContainer = {
  id: string
  name: string
  state: string
  status: string
  image: string
}

export const api = {
  config: () => request<PublicConfig>('/api/config'),
  dockerContainers: (serverId?: string) =>
    request<DockerContainer[]>(
      '/api/docker/containers' +
        (serverId ? '?server_id=' + encodeURIComponent(serverId) : ''),
    ),
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
  // Projects group services. listProjects returns each project's service count.
  projects: () => request<Project[]>('/api/projects'),
  createProject: (name: string, description: string) =>
    request<{ success: boolean; id: string }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
  deleteProject: (id: string) =>
    request<{ success: boolean }>('/api/projects/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
  createApp: (input: {
    name: string
    repo_url: string
    branch: string
    server_id: string | null
    environment: string
    project_id: string | null
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
  // Permanently delete a service: cancels in-flight builds, removes the container
  // and its volumes from the server, then deletes the app row (its builds,
  // deployments, and domains cascade away). There is no undo.
  deleteApp: (appName: string) =>
    request<{ success: boolean }>('/api/apps/delete', {
      method: 'POST',
      body: JSON.stringify({ app_name: appName }),
    }),
  // Roll back to a previously deployed build, redeploying its image on the app's
  // stable port without rebuilding. Omit buildId to roll back to the build that
  // ran just before the current one.
  rollbackApp: (appName: string, buildId?: string) =>
    request<{ success: boolean; build_id: string; message: string }>(
      '/api/apps/rollback',
      {
        method: 'POST',
        body: JSON.stringify({
          app_name: appName,
          ...(buildId ? { build_id: buildId } : {}),
        }),
      },
    ),
  // Delete one deployment (build) from the app's history. The backend refuses to
  // delete the build that's currently running (409).
  deleteDeploy: (buildId: string) =>
    request<{ success: boolean }>('/api/apps/deploys/delete', {
      method: 'POST',
      body: JSON.stringify({ build_id: buildId }),
    }),
  // Rotate the app's deploy-webhook secret, invalidating the old URL. Returns the
  // new secret so the dashboard can show the fresh URL.
  regenerateWebhook: (appName: string) =>
    request<{ success: boolean; webhook_secret: string }>(
      '/api/apps/webhook/regenerate',
      {
        method: 'POST',
        body: JSON.stringify({ app_name: appName }),
      },
    ),
  // Cancel the app's in-flight builds (Cancel Queues / Kill Build). Returns how
  // many running builds were stopped.
  cancelBuilds: (appName: string) =>
    request<{ success: boolean; cancelled: number }>(
      '/api/apps/builds/cancel',
      {
        method: 'POST',
        body: JSON.stringify({ app_name: appName }),
      },
    ),
  // Clear the app's whole build history except the running build. Returns how many
  // were removed.
  clearDeploys: (appName: string) =>
    request<{ success: boolean; deleted: number }>(
      '/api/apps/deploys/clear',
      {
        method: 'POST',
        body: JSON.stringify({ app_name: appName }),
      },
    ),
  // Update the per-app deploy toggles. Omitted fields are left unchanged.
  updateAppSettings: (
    appName: string,
    settings: { autodeploy?: boolean; clean_cache?: boolean },
  ) =>
    request<{ success: boolean }>('/api/apps/settings', {
      method: 'POST',
      body: JSON.stringify({ app_name: appName, ...settings }),
    }),
  // Replace the app's environment variables (one "KEY=value" entry per element).
  // Takes effect on the next deploy.
  updateAppEnv: (appName: string, envVariables: string[]) =>
    request<{ success: boolean }>('/api/apps/env', {
      method: 'POST',
      body: JSON.stringify({ app_name: appName, env_variables: envVariables }),
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
