'use client'

import { useEffect, useMemo, useState } from 'react'

let Paper: any, Researcher: any, analyze: any

type SEOAssistantProps = {
  title: string
  description: string
  contentHTML: string
  pageTitle?: string
  subtitle?: string
  keywords?: string
  locale?: string
  autoRunOnMount?: boolean
}

export default function SEOAssistant({
  title,
  description,
  contentHTML,
  pageTitle = '',
  subtitle = '',
  keywords = '',
  locale = 'it_IT',
  autoRunOnMount = false,
}: SEOAssistantProps) {
  const [ready, setReady] = useState(false)
  const [results, setResults] = useState<any | null>(null)
  const [score, setScore] = useState<number>(0)
  const [advice, setAdvice] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const mod = await import('yoastseo') as any
        Paper = mod.Paper || mod.default?.Paper || mod.paper || mod?.analysis?.Paper
        Researcher = mod.Researcher || mod.default?.Researcher || mod.researcher
        analyze = (mod as any).analyze || null
        setReady(true)
      } catch {
        setReady(false)
      }
    })()
  }, [])

  const canAnalyze = useMemo(() => ready || true, [ready])

  // Auto-run analysis on mount (e.g., edit page) only once per mount
  const [hasAutoRun, setHasAutoRun] = useState(false)
  useEffect(() => {
    if (autoRunOnMount && !hasAutoRun) {
      setHasAutoRun(true)
      // Delay a tick so state is ready
      setTimeout(() => { void runAnalysis() }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunOnMount])

  function runHeuristic(): { score: number; advice: string[] } {
    const html = contentHTML || ''
    const cleanText = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    const words = cleanText.length > 0 ? cleanText.split(/\s+/).length : 0
    const metaTitleLen = (title || '').trim().length
    const pageTitleLen = (pageTitle || '').trim().length
    const metaDescLen = (description || '').trim().length
    const subtitleLen = (subtitle || '').trim().length
    const keywordsList = (keywords || '').split(',').map(k => k.trim()).filter(Boolean)
    const primary = (keywordsList[0] || '').trim()

    let s = 0
    const adv: string[] = []

    // Content length (max 25)
    if (words >= 900) s += 25
    else if (words >= 600) s += 20
    else if (words >= 300) s += 15
    else if (words >= 150) { s += 8; adv.push('Aumenta il contenuto ad almeno 300 parole') }
    else { s += 2; adv.push('Aggiungi più contenuto testuale (300+ parole)') }

    // Meta title length (max 10)
    if (metaTitleLen > 0 && metaTitleLen <= 60) s += 10
    else if (metaTitleLen > 60) { s += 5; adv.push('Riduci il meta title a ~60 caratteri') }
    else adv.push('Aggiungi un meta title')

    // Page title length (max 5)
    if (pageTitleLen > 0 && pageTitleLen <= 70) s += 5
    else if (pageTitleLen > 70) { s += 3; adv.push('Riduci il titolo pagina a ~70 caratteri') }
    else adv.push('Aggiungi un titolo pagina')

    // Meta description length (max 15)
    if (metaDescLen >= 50 && metaDescLen <= 155) s += 15
    else if (metaDescLen > 155) { s += 8; adv.push('Riduci la meta description a ~155 caratteri') }
    else { s += 3; adv.push('Aggiungi una meta description di 50-155 caratteri') }

    // Subtitle presence (max 5)
    if (subtitleLen > 0) s += 5

    // Keyword checks (max 30)
    if (keywordsList.length === 0 && !primary) {
      adv.push('Aggiungi parole chiave (meta keywords)')
    }
    const textToSearch = `${pageTitle} ${title} ${description} ${subtitle} ${cleanText}`.toLowerCase()
    if (primary) {
      const primaryLower = primary.toLowerCase()
      const inTitle = pageTitle.toLowerCase().includes(primaryLower) || title.toLowerCase().includes(primaryLower)
      const inDesc = description.toLowerCase().includes(primaryLower)
      const inContent = textToSearch.includes(primaryLower)
      if (inTitle) s += 10; else adv.push('Inserisci la keyphrase nel titolo (o meta title)')
      if (inDesc) s += 8; else adv.push('Inserisci la keyphrase nella meta description')
      if (inContent) s += 12; else adv.push('Usa la keyphrase nel contenuto')
    }
    // Secondary keywords give small boosts
    const secondary = keywordsList.slice(1, 4)
    let secHits = 0
    secondary.forEach(k => { if (k && textToSearch.includes(k.toLowerCase())) secHits++ })
    s += Math.min(5, secHits * 2)

    // Content-structure suggestions based on HTML
    try {
      const h2Count = (html.match(/<h2\b[^>]*>/gi) || []).length
      const h3Count = (html.match(/<h3\b[^>]*>/gi) || []).length
      const pMatches = html.split(/<p\b[^>]*>|<\/p>/i).filter(Boolean)
      const paragraphTexts = (html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) || []).map(p => p.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
      const totalParaWords = paragraphTexts.reduce((acc, t) => acc + (t ? t.split(/\s+/).length : 0), 0)
      const avgPara = paragraphTexts.length > 0 ? Math.round(totalParaWords / paragraphTexts.length) : 0
      const imgTags = html.match(/<img\b[^>]*>/gi) || []
      const imgsWithoutAlt = imgTags.filter(tag => !/\balt\s*=\s*"[^"]+"/i.test(tag))
      const linkTags = html.match(/<a\b[^>]*href=\s*"([^"]+)"[^>]*>/gi) || []

      if (words >= 600 && (h2Count + h3Count) < 2) adv.push('Aggiungi sottotitoli (H2/H3) per sezionare il testo')
      if (avgPara > 120) adv.push('Accorcia i paragrafi (media attuale troppo lunga)')
      if (imgTags.length === 0) adv.push('Aggiungi almeno un’immagine pertinente')
      if (imgTags.length > 0 && imgsWithoutAlt.length > 0) adv.push('Aggiungi testo alt descrittivo alle immagini')
      if (linkTags.length === 0) adv.push('Aggiungi 1-2 link interni/esterni rilevanti')
      if (paragraphTexts[0] && paragraphTexts[0].split(/\s+/).length > 80) adv.push('Rendi l’introduzione più concisa e informativa')
    } catch {}

    // Clamp 0..100
    const finalScore = Math.max(0, Math.min(100, s))
    // De-duplicate advice
    const uniqueAdv = Array.from(new Set(adv))
    // Ensure we always offer improvements, even for high scores
    if (uniqueAdv.length < 3) {
      const extra: string[] = [
        'Aggiungi link interni a contenuti correlati',
        'Inserisci immagini con testo alt descrittivo',
        'Usa sottotitoli (H2/H3) per strutturare il contenuto',
        'Verifica che l\'URL sia breve e descrittivo',
        'Aggiungi una call-to-action pertinente alla fine',
      ]
      for (const tip of extra) {
        if (uniqueAdv.length >= 3) break
        if (!uniqueAdv.includes(tip)) uniqueAdv.push(tip)
      }
    }
    return { score: finalScore, advice: uniqueAdv }
  }

  async function runAnalysis() {
    setRunning(true)
    try {
      // Try yoastseo first, then heuristic for score/advice
      if (ready && (analyze || (Paper && Researcher))) {
        try {
          if (analyze) {
            const res = (analyze as any)({
              text: contentHTML || '',
              title: title || '',
              description: description || '',
              keyword: (keywords || '').split(',')[0] || '',
              locale,
            })
            setResults(res)
          } else if (Paper && Researcher) {
            const paper = new (Paper as any)(contentHTML || '', {
              keyword: (keywords || '').split(',')[0] || '',
              title: title || '',
              description: description || '',
              locale,
            })
            const researcher = new (Researcher as any)(paper)
            const readability = researcher.getResearch('readingEase')
            const wordCount = researcher.getResearch('wordCountInText')
            setResults({ readability, wordCount })
          }
        } catch {
          setResults(null)
        }
      }
      const h = runHeuristic()
      setScore(h.score)
      setAdvice(h.advice)
    } finally {
      setRunning(false)
    }
  }

  const scoreCircle = useMemo(() => {
    const cls = score >= 80 ? 'bg-green-600' : score >= 60 ? 'bg-amber-600' : 'bg-red-600'
    return (
      <div className={`h-8 w-8 rounded-full ${cls} flex items-center justify-center text-[11px] font-bold text-white`} aria-label={`Punteggio SEO ${score}`}>
        {score}
      </div>
    )
  }, [score])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">SEO Assistant</h4>
        <div className="flex items-center gap-3">
          {scoreCircle}
          <button type="button" onClick={runAnalysis} disabled={running || !canAnalyze} className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50">
            {running ? 'Analisi...' : 'Analizza SEO'}
          </button>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        {results && Array.isArray((results as any)?.seo?.results) ? (
          <div className="space-y-1">
            {(results as any).seo.results.slice(0, 5).map((r: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2">
                <span className={`mt-1 inline-block w-2 h-2 rounded-full ${colorFromScore(r.score)}`} />
                <div>{r.text || r.description || JSON.stringify(r)}</div>
              </div>
            ))}
          </div>
        ) : null}
        {advice.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Consigli</div>
              <ul className="list-disc pl-5 space-y-1">
                {advice.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
        )}
        {advice.length === 0 && !running && (
          <div className="text-xs text-gray-500">Premi "Analizza SEO" per generare consigli</div>
        )}
      </div>
    </div>
  )
}

function colorFromScore(score?: number) {
  if (typeof score !== 'number') return 'bg-gray-300'
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

