import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { StreamLanguage } from '@codemirror/language'
import { properties } from '@codemirror/legacy-modes/mode/properties'
import { api, type App } from '@/api'
import { errorMessage } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

const PLACEHOLDER = 'NODE_ENV=production\nPORT=3000'

export function Environment({ app }: { app: App }) {
  const initial = useMemo(() => envToText(app.env_variables), [app.env_variables])
  const [text, setText] = useState(initial)
  const [hidden, setHidden] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => setText(initial), [initial])

  const dirty = text.trim() !== initial.trim()

  async function save() {
    setSaving(true)
    try {
      await api.updateAppEnv(app.name, textToEnv(text))
      toast('Environment variables saved')
    } catch (err) {
      toast(errorMessage(err, 'Could not save environment variables.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            Environment Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            You can add environment variables to your resource.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={!hidden}
          aria-label={hidden ? 'Show values' : 'Hide values'}
          onClick={() => setHidden((v) => !v)}
        >
          {hidden ? (
            <EyeOff className="size-4 text-muted-foreground" />
          ) : (
            <Eye className="size-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      <div
        className="relative overflow-hidden rounded-lg border border-border font-mono text-sm"
        style={
          hidden ? ({ WebkitTextSecurity: 'disc' } as CSSProperties) : undefined
        }
      >
        <CodeMirror
          value={text}
          onChange={setText}
          height="384px"
          theme="dark"
          editable={!hidden}
          placeholder={PLACEHOLDER}
          extensions={[StreamLanguage.define(properties)]}
          basicSetup={{ foldGutter: false, lineNumbers: true }}
        />
        {hidden && (
          <div
            aria-hidden
            className="absolute inset-0 z-10 cursor-not-allowed bg-background/30"
          />
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={hidden || !dirty || saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
      </div>
    </section>
  )
}

function envToText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>
          const key = o.key ?? o.name
          if (key != null) return `${key}=${o.value ?? ''}`
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}=${v ?? ''}`)
      .join('\n')
  }
  return ''
}

function textToEnv(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}
