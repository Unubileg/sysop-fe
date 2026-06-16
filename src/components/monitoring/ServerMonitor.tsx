import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, type Server, type ServerMetrics } from '@/api'
import { errorMessage } from '@/lib/errors'
import { formatBytes } from '@/lib/format'

const POLL_MS = 3000
const MAX_POINTS = 40 // ~2 minutes of history at the poll interval
const GiB = 1024 ** 3

// A point in the live, client-side time series. We don't store history on the
// server — the charts fill in as the page stays open, like Dokploy/Netlify.
type Point = { t: number; cpu: number; memGiB: number; diskGB: number }

// Monitoring polls one server and shows live CPU, memory, disk, Docker disk
// breakdown, and block/network I/O. The line/area charts accumulate while the
// page is open; the snapshot cards reflect the latest poll.
export function ServerMonitor({ server }: { server: Server }) {
  const [latest, setLatest] = useState<ServerMetrics | null>(null)
  const [history, setHistory] = useState<Point[]>([])
  const [error, setError] = useState('')
  const seq = useRef(0)

  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const m = await api.serverMetrics(server.id)
        if (!alive) return
        setError('')
        setLatest(m)
        setHistory((prev) =>
          [
            ...prev,
            {
              t: seq.current++,
              cpu: Number(m.cpu_percent.toFixed(2)),
              memGiB: m.memory_used_bytes / GiB,
              diskGB: m.disk_used_bytes / GiB,
            },
          ].slice(-MAX_POINTS),
        )
      } catch (err) {
        if (alive) setError(errorMessage(err, 'Could not load metrics.'))
      }
    }
    void tick()
    const id = setInterval(tick, POLL_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [server.id])

  if (error && !latest) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    )
  }
  if (!latest) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-16 text-center text-sm text-muted-foreground">
        Collecting metrics…
      </div>
    )
  }

  const memPct = latest.memory_total_bytes
    ? (latest.memory_used_bytes / latest.memory_total_bytes) * 100
    : 0
  const diskPct = latest.disk_total_bytes
    ? (latest.disk_used_bytes / latest.disk_total_bytes) * 100
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium">Monitoring</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live usage of {server.name} ({server.ip_address}).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="CPU Usage" subtitle={`Used: ${latest.cpu_percent.toFixed(2)}%`}>
          <Meter pct={latest.cpu_percent} color="#3b82f6" />
          <ChartFrame>
            <LineChart data={history}>
              {axes((v) => `${v}%`, [0, 100])}
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="CPU %"
              />
            </LineChart>
          </ChartFrame>
        </Card>

        <Card
          title="Memory Usage"
          subtitle={`Used: ${formatBytes(latest.memory_used_bytes)} / Limit: ${formatBytes(latest.memory_total_bytes)}`}
        >
          <Meter pct={memPct} color="#ec4899" />
          <ChartFrame>
            <AreaChart data={history}>
              {axes((v) => `${v} GiB`, [
                0,
                Math.max(1, latest.memory_total_bytes / GiB),
              ])}
              <Area
                type="monotone"
                dataKey="memGiB"
                stroke="#ec4899"
                fill="#ec4899"
                fillOpacity={0.25}
                strokeWidth={2}
                isAnimationActive={false}
                name="Memory (GiB)"
              />
            </AreaChart>
          </ChartFrame>
        </Card>

        <Card
          title="Disk Space"
          subtitle={`Used: ${formatBytes(latest.disk_used_bytes)} / Limit: ${formatBytes(latest.disk_total_bytes)}`}
        >
          <Meter pct={diskPct} color="#f59e0b" />
          <ChartFrame>
            <AreaChart data={history}>
              {axes((v) => `${v} GiB`, [
                0,
                Math.max(1, latest.disk_total_bytes / GiB),
              ])}
              <Area
                type="monotone"
                dataKey="diskGB"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.25}
                strokeWidth={2}
                isAnimationActive={false}
                name="Disk (GiB)"
              />
            </AreaChart>
          </ChartFrame>
        </Card>

        <DockerCard metrics={latest} />

        <Card title="Block I/O" subtitle="Cumulative since the host booted">
          <Stat label="Read" value={formatBytes(latest.block_read_bytes)} />
          <Stat label="Write" value={formatBytes(latest.block_write_bytes)} />
        </Card>

        <Card title="Network I/O" subtitle="Cumulative since the host booted">
          <Stat label="In" value={formatBytes(latest.network_rx_bytes)} />
          <Stat label="Out" value={formatBytes(latest.network_tx_bytes)} />
        </Card>
      </div>
    </div>
  )
}

// DockerCard renders the `docker system df` breakdown as a donut.
function DockerCard({ metrics }: { metrics: ServerMetrics }) {
  const slices = [
    { name: 'Images', value: metrics.docker_images_bytes, color: '#3b82f6' },
    { name: 'Containers', value: metrics.docker_containers_bytes, color: '#ec4899' },
    { name: 'Volumes', value: metrics.docker_volumes_bytes, color: '#f59e0b' },
    { name: 'Build Cache', value: metrics.docker_build_cache_bytes, color: '#a855f7' },
  ]
  const total = slices.reduce((sum, s) => sum + s.value, 0)

  return (
    <Card title="Docker Disk Usage" subtitle={`Total: ${formatBytes(total)}`}>
      {total === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No Docker disk usage.
        </p>
      ) : (
        <>
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="90%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {slices.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => formatBytes(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold">{formatBytes(total)}</span>
              <span className="text-xs text-muted-foreground">Docker Usage</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {slices.map((s) => (
              <span
                key={s.name}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  className="size-2.5 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                {s.name}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

// Card is one monitoring panel: a title, sub-line, and content.
function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

// Meter is the thin progress bar shown above a usage chart.
function Meter({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
      />
    </div>
  )
}

// Stat is a label/value row for the cumulative I/O cards.
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  )
}

// ChartFrame wraps a recharts chart at a fixed height in a responsive container.
function ChartFrame({ children }: { children: ReactNode }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}

// axes builds the shared X/Y axes + tooltip for the time-series charts. The X
// axis (the synthetic sample index) is hidden; the Y axis is fixed to the
// resource's range so the line doesn't jump as values change. recharts flattens
// fragment children, so returning them from a helper works.
function axes(fmt: (v: number) => string, domain: [number, number]) {
  return (
    <>
      <XAxis dataKey="t" hide />
      <YAxis
        domain={domain}
        tickFormatter={(v) => fmt(Number(v))}
        width={56}
        tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <Tooltip
        contentStyle={tooltipStyle}
        labelFormatter={() => ''}
        formatter={(v) => fmt(Number(v))}
        cursor={{ stroke: 'var(--border)' }}
      />
    </>
  )
}

const tooltipStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--popover-foreground)',
}
