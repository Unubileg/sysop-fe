import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollText, Trash2, Download, ArrowDownToLine } from 'lucide-react'
import { BASE, type App } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const MAX_LINES = 5000

type Status = 'connecting' | 'live' | 'closed'

export function Logs({ app }: { app: App }) {
  const [lines, setLines] = useState<string[]>([])
  const [status, setStatus] = useState<Status>('connecting')
  const [search, setSearch] = useState('')
  const [follow, setFollow] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLines([])
    setStatus('connecting')
    const es = new EventSource(
      `${BASE}/api/apps/logs?id=${encodeURIComponent(app.id)}`,
      { withCredentials: true },
    )
    es.onopen = () => setStatus('live')
    es.onmessage = (e) => {
      setLines((prev) => {
        const next = prev.concat(e.data)
        return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next
      })
    }
    es.onerror = () => setStatus('closed')
    return () => es.close()
  }, [app.id])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? lines.filter((l) => l.toLowerCase().includes(q)) : lines
  }, [lines, search])

  useEffect(() => {
    if (follow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filtered, follow])

  function download() {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${app.name}-logs.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ScrollText className="size-6 text-muted-foreground" />
            Logs
          </h2>
          <p className="text-sm text-muted-foreground">
            Watch the logs of your application in real time.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter logs..."
          className="max-w-xs"
        />
        <Button
          variant={follow ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setFollow((v) => !v)}
          aria-pressed={follow}
        >
          <ArrowDownToLine className="size-4" />
          {follow ? 'Following' : 'Follow'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLines([])}
          disabled={lines.length === 0}
        >
          <Trash2 className="size-4" />
          Clear
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={download}
          disabled={lines.length === 0}
        >
          <Download className="size-4" />
          Download
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="h-[60vh] overflow-auto rounded-lg border border-border bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100"
        onScroll={(e) => {
          const el = e.currentTarget
          const atBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 24
          setFollow(atBottom)
        }}
      >
        {filtered.length === 0 ? (
          <p className="text-zinc-500">
            {status === 'connecting'
              ? 'Connecting to log stream…'
              : search.trim()
                ? 'No lines match the filter.'
                : 'No logs yet.'}
          </p>
        ) : (
          filtered.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {line || ' '}
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function StatusBadge({ status }: { status: Status }) {
  const map = {
    connecting: { label: 'Connecting', dot: 'bg-amber-500 animate-pulse' },
    live: { label: 'Live', dot: 'bg-emerald-500' },
    closed: { label: 'Disconnected', dot: 'bg-red-500' },
  }[status]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-medium">
      <span className={cn('size-2 rounded-full', map.dot)} />
      {map.label}
    </span>
  )
}
