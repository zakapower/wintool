import type { DiskVolume } from './types.ts'

export const MIN_VOLUMES = 2
export const MAX_VOLUMES = 5
export const MIN_WINDOWS_GB = 40
export const MIN_DATA_GB = 1

export const DEFAULT_VOLUMES: DiskVolume[] = [
  { letter: 'C', label: 'Windows', sizeGb: 150 },
  { letter: 'D', label: 'Data', sizeGb: null },
]

const LETTERS = ['C', 'D', 'E', 'F', 'G'] as const

export function nextVolumeLetter(volumes: DiskVolume[]): string {
  const used = new Set(volumes.map((v) => v.letter.toUpperCase()))
  for (const L of LETTERS) {
    if (!used.has(L)) return L
  }
  return 'Z'
}

export function normalizeVolumes(volumes: DiskVolume[]): DiskVolume[] {
  const list = volumes.map((v) => ({
    letter: v.letter.toUpperCase().slice(0, 1) || 'D',
    label: v.label.trim() || 'Data',
    sizeGb: v.sizeGb,
  }))
  if (!list.length) return DEFAULT_VOLUMES.map((v) => ({ ...v }))
  list[0] = { ...list[0], letter: 'C' }
  const last = list.length - 1
  list[last] = { ...list[last], sizeGb: null }
  for (let i = 0; i < last; i++) {
    if (list[i].sizeGb == null) list[i].sizeGb = i === 0 ? 150 : 50
  }
  return list
}
