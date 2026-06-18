import { useEffect, useState } from 'react'

const KEY = 'sysop:favorite-apps'
const EVENT = 'sysop:favorites-changed'

export function getFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function toggleFavorite(name: string): void {
  const favs = getFavorites()
  if (favs.has(name)) favs.delete(name)
  else favs.add(name)
  localStorage.setItem(KEY, JSON.stringify([...favs]))
  window.dispatchEvent(new Event(EVENT))
}

export function useFavorites(): Set<string> {
  const [favs, setFavs] = useState(getFavorites)
  useEffect(() => {
    const sync = () => setFavs(getFavorites())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return favs
}
