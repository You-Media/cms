'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'

// Lazy import to avoid heavy initial bundle if needed (optionally we can direct import)
let Paper: any, Researcher: any, analyze: any

export default function SEOAssistant({
  title,
  description,
  contentHTML,
  focusKeyphrase,
  locale = 'it_IT',
}: {
  title: string
  description: string
  contentHTML: string
  focusKeyphrase: string
  locale?: string
}) {
  const [ready, setReady] = useState(false)
  const [results, setResults] = useState<any | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const mod = await import('yoastseo') as any
        // Different versions expose different APIs; best-effort support
        Paper = mod.Paper || mod.default?.Paper || mod.paper || mod?.analysis?.Paper
        Researcher = mod.Researcher || mod.default?.Researcher || mod.researcher
        analyze = (mod as any).analyze || null
        setReady(true)
      } catch (e) {
        console.error('yoastseo not available', e)
        setReady(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const canAnalyze = useMemo(() => ready && (analyze || (Paper && Researcher)), [ready])

  useEffect(() => {
    if (!canAnalyze) return
    const run = async () => {
      try {
        if (analyze) {
          const res = (analyze as any)({
            text: contentHTML || '',
            title: title || '',
            description: description || '',
            keyword: focusKeyphrase || '',
            locale,
          })
          setResults(res)
          return
        }
        if (Paper && Researcher) {
          // Fallback approach with Paper/Researcher
          const paper = new (Paper as any)(contentHTML || '', {
            keyword: focusKeyphrase || '',
            title: title || '',
            description: description || '',
            locale,
          })
          const researcher = new (Researcher as any)(paper)
          // Basic checks
          const readability = researcher.getResearch('readingEase')
          const wordCount = researcher.getResearch('wordCountInText')
          setResults({ readability, wordCount })
        }
      } catch (e) {
        console.error('SEO analysis failed', e)
        setResults(null)
      }
    }
    void run()
  }, [canAnalyze, title, description, contentHTML, focusKeyphrase, locale])

  const quickHints = useMemo(() => {
    const hints: string[] = []
    const textLen = (contentHTML || '').replace(/<[^>]*>/g, '').trim().length
    if (title && title.length > 60) hints.push('Riduci il meta title a ~60 caratteri')
    if (description && description.length > 155) hints.push('Riduci la meta description a ~155 caratteri')
    if (focusKeyphrase) {
      if (!new RegExp(`\\b${escapeRegex(focusKeyphrase)}\\b`, 'i').test(title || '')) hints.push('Inserisci la keyphrase nel meta title')
      if (!new RegExp(`\\b${escapeRegex(focusKeyphrase)}\\b`, 'i').test(description || '')) hints.push('Inserisci la keyphrase nella meta description')
    }
    if (textLen < 300) hints.push('Aumenta la lunghezza del contenuto (300+ parole consigliate)')
    return hints
  }, [title, description, contentHTML, focusKeyphrase])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">SEO Assistant</h4>
        {!canAnalyze && <div className="text-xs text-gray-500">Preparazione analisi...</div>}
      </div>
      {results ? (
        <div className="space-y-2 text-sm">
          {/* Best-effort display depending on API shape */}
          {'seo' in results && Array.isArray(results.seo?.results) ? (
            <div className="space-y-1">
              {results.seo.results.slice(0, 5).map((r: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${scoreColor(r.score)}`} />
                  <div>{r.text || r.description || JSON.stringify(r)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Suggerimenti rapidi</div>
          )}
          {quickHints.length > 0 && (
            <ul className="list-disc pl-5 space-y-1">
              {quickHints.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          )}
        </div>
      ) : (
        <div className="text-xs text-gray-500">Nessun risultato disponibile</div>
      )}
    </div>
  )
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
}

function scoreColor(score?: number) {
  if (typeof score !== 'number') return 'bg-gray-300'
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}
