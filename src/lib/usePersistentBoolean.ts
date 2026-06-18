import { useCallback, useEffect, useState } from 'react'
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
