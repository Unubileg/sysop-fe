import type { App, AppDomain, PublicConfig } from '@/api'

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
