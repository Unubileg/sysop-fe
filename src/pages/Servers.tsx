import PageShell, { PageHeader, Placeholder } from '@/components/layout/PageShell'

export default function Servers() {
  return (
    <PageShell>
      <PageHeader
        title="Servers"
        description="Hosts running the sysopd agent."
      />
      <Placeholder />
    </PageShell>
  )
}
