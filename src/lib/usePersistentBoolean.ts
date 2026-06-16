import { useCallback, useEffect, useState } from 'react'

// usePersistentBoolean is a boolean useState that survives reloads by mirroring
// to localStorage under `key`. When `key` changes (e.g. navigating between
// projects) it re-reads, so each project keeps its own value. Falls back to
// `fallback` when nothing is stored or storage is unavailable (SSR/private
// mode), and never throws.
export function usePersistentBoolean(
  key: string,
  fallback: boolean,
): readonly [boolean, (next: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => read(key, fallback))

  useEffect(() => {
    setValue(read(key, fallback))
  }, [key, fallback])

  const set = useCallback(
    (next: boolean) => {
      setValue(next)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Storage can be unavailable (private mode, quota); keep in-memory state.
      }
    },
    [key],
  )

  return [value, set] as const
}

function read(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) === true
  } catch {
    return fallback
  }
}
