import type { InstallAppId } from './installApps.ts'
import { INSTALL_APP_CATALOG, type InstallAppEntry } from './installApps.ts'

export type InstallAppCategoryId =
  | 'all'
  | 'browsers'
  | 'tools'
  | 'dev'
  | 'chat'
  | 'media'
  | 'notes'
  | 'runtimes'

export const INSTALL_APP_CATEGORIES: Array<{
  id: InstallAppCategoryId
  ru: string
  en: string
}> = [
  { id: 'all', ru: 'Все', en: 'All' },
  { id: 'browsers', ru: 'Браузеры', en: 'Browsers' },
  { id: 'tools', ru: 'Утилиты', en: 'Utilities' },
  { id: 'dev', ru: 'Разработка', en: 'Development' },
  { id: 'chat', ru: 'Связь', en: 'Chat' },
  { id: 'media', ru: 'Медиа и игры', en: 'Media & games' },
  { id: 'notes', ru: 'Заметки', en: 'Notes' },
  { id: 'runtimes', ru: 'Офис и среды', en: 'Office & runtimes' },
]

const BY_ID: Record<InstallAppId, InstallAppCategoryId> = {
  chrome: 'browsers',
  firefox: 'browsers',
  brave: 'browsers',
  yandex: 'browsers',
  '7zip': 'tools',
  winrar: 'tools',
  notepadpp: 'tools',
  powertoys: 'tools',
  everything: 'tools',
  geek: 'tools',
  revo: 'tools',
  v2raytun: 'tools',
  cloudflare: 'tools',
  anydesk: 'tools',
  sharex: 'tools',
  windhawk: 'tools',
  vscode: 'dev',
  cursor: 'dev',
  git: 'dev',
  discord: 'chat',
  telegram: 'chat',
  steam: 'media',
  epic: 'media',
  battlenet: 'media',
  ubisoft: 'media',
  ea: 'media',
  vlc: 'media',
  qbittorrent: 'media',
  spotify: 'media',
  obsidian: 'notes',
  notion: 'notes',
  office: 'runtimes',
  dotnet8: 'runtimes',
  vcredist: 'runtimes',
}

export function installAppCategory(id: InstallAppId): InstallAppCategoryId {
  return BY_ID[id]
}

export function installAppsInCategory(
  category: InstallAppCategoryId,
): InstallAppEntry[] {
  return INSTALL_APP_CATALOG.filter((a) => installAppCategory(a.id) === category)
}
