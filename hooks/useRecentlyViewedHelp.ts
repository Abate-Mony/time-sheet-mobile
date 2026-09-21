import { useCallback, useEffect, useState } from "react"
import * as SecureStore from "expo-secure-store"
import { getArticleBySlug, type HelpArticle } from "@/data/helpArticles"

const MAX_RECENT = 5
const STORAGE_KEY = "help-recently-viewed"

function parseSlugs(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : []
  } catch {
    return []
  }
}

/**
 * Recently viewed Help Centre articles, kept in SecureStore so this is real
 * per-device history rather than a fabricated "popular guides" list backed
 * by analytics that don't exist. Mirrors work.wk's
 * useRecentlyViewedHelp.ts (localStorage there, SecureStore — necessarily
 * async — here). This app is worker-only, so there's no role parameter to
 * thread through the way the web version has one.
 */
export function useRecentlyViewedHelp() {
  const [slugs, setSlugs] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    SecureStore.getItemAsync(STORAGE_KEY).then(raw => {
      if (!cancelled) setSlugs(parseSlugs(raw))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const markViewed = useCallback((slug: string) => {
    setSlugs(prev => {
      const next = [slug, ...prev.filter(s => s !== slug)].slice(0, MAX_RECENT)
      // Best-effort — no history persisting is a fine fallback if storage fails.
      SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [])

  const recent = slugs
    .map(slug => getArticleBySlug(slug))
    .filter((a): a is HelpArticle => !!a)

  return { recent, markViewed }
}
