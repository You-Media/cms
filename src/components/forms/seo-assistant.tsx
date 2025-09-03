'use client'

import { useEffect, useMemo, useState } from 'react'

// Rimosso supporto yoastseo per build production senza dipendenza

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
  const [score, setScore] = useState<number>(0)
  const [advice, setAdvice] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  // Auto-run analysis on mount (e.g., edit page) only once per mount
  const [hasAutoRun, setHasAutoRun] = useState(false)
  useEffect(() => {
    if (autoRunOnMount && !hasAutoRun) {
      setHasAutoRun(true)
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

    if (words >= 900) s += 25
    else if (words >= 600) s += 20
    else if (words >= 300) s += 15
    else if (words >= 150) { s += 8; adv.push('Aumenta il contenuto ad almeno 300 parole') }
    else { s += 2; adv.push('Aggiungi più contenuto testuale (300+ parole)') }

    if (metaTitleLen > 0 && metaTitleLen <= 60) s += 10
    else if (metaTitleLen > 60) { s += 5; adv.push('Riduci il meta title a ~60 caratteri') }
    else adv.push('Aggiungi un meta title')

    if (pageTitleLen > 0 && pageTitleLen <= 70) s += 5
    else if (pageTitleLen > 70) { s += 3; adv.push('Riduci il titolo pagina a ~70 caratteri') }
    else adv.push('Aggiungi un titolo pagina')

    if (metaDescLen >= 50 && metaDescLen <= 155) s += 15
    else if (metaDescLen > 155) { s += 8; adv.push('Riduci la meta description a ~155 caratteri') }
    else { s += 3; adv.push('Aggiungi una meta description di 50-155 caratteri') }

    if (subtitleLen > 0) s += 5

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

    try {
      const h2Count = (html.match(/<h2\b[^>]*>/gi) || []).length
      const h3Count = (html.match(/<h3\b[^>]*>/gi) || []).length
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

    const finalScore = Math.max(0, Math.min(100, s))
    const uniqueAdv = Array.from(new Set(adv))
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
          <button type="button" onClick={runAnalysis} disabled={running} className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50">
            {running ? 'Analisi...' : 'Analizza SEO'}
          </button>
        </div>
      </div>
      <div className="space-y-2 text-sm">
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

