import { useEffect, useState } from 'react'

// Favorite apps are a local convenience: the backend has no per-user favourites,
// so we keep the starred set in localStorage and sync it across components (and
// browser tabs) with events.
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

// useFavorites re-renders the caller whenever the set changes, including edits
// from another tab via the native 'storage' event.
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
