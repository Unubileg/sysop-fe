import { useEffect, useState, type DependencyList } from 'react'
import { errorMessage } from '@/lib/errors'

// useFetch runs `fetcher` on mount and whenever `deps` change, discarding a
// response that arrives after the inputs changed or the component unmounted —
// the stale-response guard that every data page used to spell out by hand. It
// keeps the previous data visible while reloading; `reload()` re-runs the fetch.
//
// The fetcher is recreated each render, so `deps` (not the fetcher) are the real
// inputs — pass exactly what the fetch reads. State is only ever set from inside
// the promise callbacks, never synchronously in the effect body.
export function useFetch<T>(fetcher: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    fetcher()
      .then((d) => {
        if (!alive) return
        setData(d)
        setError('')
      })
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [...deps, nonce])

  return { data, error, loading, reload: () => setNonce((n) => n + 1) }
}
