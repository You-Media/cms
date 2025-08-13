import type { BannerModel, BannerPosition } from '@/types/banners'

export type ImageRequirement = { width: number; height: number }

export type ModelConstraint = {
  allowedPositions?: BannerPosition[]
  requiredOrder?: number | null
  allowedOrders?: number[] | null
  requiredImage?: ImageRequirement | null
  requiredImageByPosition?: Partial<Record<BannerPosition, ImageRequirement>>
}

export type BannerConstraints = Partial<Record<BannerModel, ModelConstraint>>

// Centralized, easily editable constraints per model
export const BANNER_CONSTRAINTS: BannerConstraints = {
  Home: {
    allowedPositions: ['center'],
    requiredOrder: 1,
    allowedOrders: null,
    requiredImage: { width: 1440, height: 90 },
  },
  Category: {
    allowedPositions: ['center'],
    requiredOrder: null,
    allowedOrders: [1, 2, 3, 4],
    requiredImage: { width: 1440, height: 90 },
  },
  Article: {
    // No hard constraints by default; edit here if needed
    allowedPositions: ['center', 'right'],
    requiredOrder: 1,
    allowedOrders: null,
    requiredImage: null,
    requiredImageByPosition: {
      center: { width: 1140, height: 90 },
      right: { width: 300, height: 250 },
    },
  },
  Search: {
    // Search banners behave like Home (global context), no model_id required
    allowedPositions: ['center'],
    requiredOrder: null,
    allowedOrders: [1,2,3],
    requiredImage: { width: 1440, height: 90 },
  },
}

export function getAllowedPositions(model?: BannerModel | ''): BannerPosition[] {
  if (!model) return ['left', 'center', 'right']
  return BANNER_CONSTRAINTS[model]?.allowedPositions ?? ['left', 'center', 'right']
}

export function getRequiredOrder(model?: BannerModel | ''): number | null {
  if (!model) return null
  return BANNER_CONSTRAINTS[model]?.requiredOrder ?? null
}

export function getRequiredImage(model?: BannerModel | ''): ImageRequirement | null {
  if (!model) return null
  return BANNER_CONSTRAINTS[model]?.requiredImage ?? null
}

export function getRequiredImageFor(model?: BannerModel | '', position?: BannerPosition | ''): ImageRequirement | null {
  if (!model) return null
  const cfg = BANNER_CONSTRAINTS[model]
  if (!cfg) return null
  if (position && cfg.requiredImageByPosition && cfg.requiredImageByPosition[position]) {
    return cfg.requiredImageByPosition[position] as ImageRequirement
  }
  return cfg.requiredImage ?? null
}

export function getAllowedOrders(model?: BannerModel | ''): number[] | null {
  if (!model) return null
  const arr = BANNER_CONSTRAINTS[model]?.allowedOrders
  return Array.isArray(arr) && arr.length ? arr : null
}


