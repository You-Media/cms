import { useEffect, useState } from 'react'

type RegionItem = { name: string; code?: string }
type ProvinceItem = { name: string; code?: string; abbreviation?: string; regionName?: string }

const LOCAL_URL = '/geo/regions-provinces.json'

let cachedRegions: RegionItem[] | null = null
let cachedProvinces: ProvinceItem[] | null = null
let inFlight: Promise<void> | null = null

async function fetchDatasets(): Promise<void> {
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const res = await fetch(LOCAL_URL, { cache: 'force-cache' })
      const json = await res.json()
      const regionsArray = Array.isArray(json) ? json : []
      cachedRegions = regionsArray.map((r: any) => ({ name: r?.name || '', code: r?.code || undefined })).filter((r: RegionItem) => r.name)
      const provs: ProvinceItem[] = []
      regionsArray.forEach((r: any) => {
        const regName = r?.name || ''
        const provinces = Array.isArray(r?.provinces) ? r.provinces : []
        provinces.forEach((p: any) => {
          provs.push({ name: p?.name || '', code: p?.code || undefined, abbreviation: p?.code || undefined, regionName: regName })
        })
      })
      cachedProvinces = provs.filter((p) => p.name)
    } catch {
      // Fail silently; consumers will see empty lists
      cachedRegions = cachedRegions || []
      cachedProvinces = cachedProvinces || []
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

export function useItalyGeo() {
  const [regions, setRegions] = useState<RegionItem[]>(cachedRegions || [])
  const [provinces, setProvinces] = useState<ProvinceItem[]>(cachedProvinces || [])
  const [loading, setLoading] = useState<boolean>(!cachedRegions || !cachedProvinces)

  useEffect(() => {
    let aborted = false
    async function load() {
      await fetchDatasets()
      if (aborted) return
      setRegions(cachedRegions || [])
      setProvinces(cachedProvinces || [])
      setLoading(false)
    }
    void load()
    return () => { aborted = true }
  }, [])

  const searchRegions = (query: string): RegionItem[] => {
    const q = query.trim().toLowerCase()
    if (!q) return regions
    return regions.filter((r) => r.name.toLowerCase().includes(q))
  }

  const searchProvinces = (query: string, filterRegionName?: string | null): ProvinceItem[] => {
    const q = query.trim().toLowerCase()
    const list = filterRegionName ? provinces.filter((p) => (p.regionName || '').toLowerCase() === filterRegionName.toLowerCase()) : provinces
    if (!q) return list
    return list.filter((p) => p.name.toLowerCase().includes(q))
  }

  return { regions, provinces, loading, searchRegions, searchProvinces }
}


