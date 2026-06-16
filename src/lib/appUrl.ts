import type { App, AppDomain, PublicConfig } from '@/api'

// appUrl returns the app's canonical public URL, mirroring how the gateway
// resolves it:
//   1. an attached custom domain (first one), else
//   2. the default "<app>.<base>" subdomain when a base domain is configured,
//   3. otherwise the raw server IP:port (dev, before any domain is set up).
// The scheme follows config.tls (https once Let's Encrypt is on). Returns null
// when the app has no address yet (unassigned server, no domain).
export function appUrl(
  app: App,
  config: PublicConfig | null,
  domains: AppDomain[] = [],
): string | null {
  const scheme = config?.tls ? 'https' : 'http'
  if (domains.length > 0) {
    return `${scheme}://${domains[0].domain}`
  }
  if (config?.base_domain) {
    return `${scheme}://${app.name}.${config.base_domain}`
  }
  if (app.server_ip) {
    return `http://${app.server_ip}${app.port ? `:${app.port}` : ''}`
  }
  return null
}
