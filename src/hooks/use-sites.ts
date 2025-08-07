import { useMemo } from 'react';
import sitesData from '@/data/sites.json';

export interface Site {
  id: string;
  name: string;
  domain: string;
  description: string;
  active: boolean;
}

export function useSites() {
  const sites = useMemo(() => {
    return sitesData.sites as Site[];
  }, []);

  const activeSites = useMemo(() => {
    return sites.filter(site => site.active);
  }, [sites]);

  const getSiteById = (id: string): Site | undefined => {
    return sites.find(site => site.id === id);
  };

  const getSiteByDomain = (domain: string): Site | undefined => {
    return sites.find(site => site.domain === domain);
  };

  return {
    sites,
    activeSites,
    getSiteById,
    getSiteByDomain,
  };
}
