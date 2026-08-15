import fs from 'fs'

const j = JSON.parse(
  fs.readFileSync(
    'C:/Users/Admin/.cursor/projects/c-Users-Admin-projects-wintool/agent-tools/42db3618-fa6a-4397-aa6a-438434a2997d.txt',
    'utf8',
  ),
)

const ruMap = {
  'Clipchamp.Clipchamp': 'Clipchamp',
  'Microsoft.3DBuilder': '3D Builder',
  'Microsoft.549981C3F5F10': 'Cortana',
  'Microsoft.BingFinance': 'Bing Финансы',
  'Microsoft.BingFoodAndDrink': 'Bing Еда и напитки',
  'Microsoft.BingHealthAndFitness': 'Bing Здоровье',
  'Microsoft.BingNews': 'Bing Новости',
  'Microsoft.BingSports': 'Bing Спорт',
  'Microsoft.BingTranslator': 'Bing Переводчик',
  'Microsoft.BingTravel': 'Bing Путешествия',
  'Microsoft.BingWeather': 'Погода',
  'Microsoft.Windows.AIHub': 'Copilot+ AI Hub',
  'Microsoft.PCManager': 'Microsoft PC Manager',
  'Microsoft.Getstarted': 'Советы / Get Started',
  'Microsoft.Messaging': 'Сообщения',
  'Microsoft.Microsoft3DViewer': '3D Viewer',
  'Microsoft.MicrosoftJournal': 'Microsoft Journal',
  'Microsoft.MicrosoftOfficeHub': 'Microsoft 365 (Office Hub)',
  'Microsoft.MicrosoftPowerBIForWindows': 'Power BI',
  'Microsoft.MicrosoftSolitaireCollection': 'Косынка (Solitaire)',
  'Microsoft.MicrosoftStickyNotes': 'Записки',
  'Microsoft.MixedReality.Portal': 'Mixed Reality Portal',
  'Microsoft.NetworkSpeedTest': 'Проверка скорости сети',
  'Microsoft.News': 'Microsoft News / Start',
  'Microsoft.Office.OneNote': 'OneNote (UWP)',
  'Microsoft.Office.Sway': 'Sway',
  'Microsoft.OneConnect': 'One Connect / Mobile Plans',
  'Microsoft.Print3D': 'Print 3D',
  'Microsoft.PowerAutomateDesktop': 'Power Automate',
  'Microsoft.SkypeApp': 'Skype',
  'Microsoft.Todos': 'Microsoft To Do',
  'Microsoft.Windows.DevHome': 'Dev Home',
  'Microsoft.WindowsAlarms': 'Часы и будильники',
  'Microsoft.WindowsFeedbackHub': 'Feedback Hub',
  'Microsoft.WindowsMaps': 'Карты',
  'Microsoft.WindowsSoundRecorder': 'Диктофон',
  'Microsoft.XboxApp': 'Xbox Console Companion',
  'Microsoft.ZuneVideo': 'Кино и ТВ',
  'MicrosoftCorporationII.MicrosoftFamily': 'Family Safety',
  'MicrosoftCorporationII.QuickAssist': 'Быстрая помощь',
  'MicrosoftTeams': 'Microsoft Teams (старый)',
  'MSTeams': 'Microsoft Teams',
  'Microsoft.BingSearch': 'Bing Search',
  'Microsoft.GamingApp': 'Xbox Game Bar / Gaming App',
  'Microsoft.GetHelp': 'Получить помощь',
  'Microsoft.M365Companions': 'Microsoft 365 Companions',
  'Microsoft.MSPaint': 'Paint 3D',
  'Microsoft.OutlookForWindows': 'Outlook (new)',
  'Microsoft.Paint': 'Paint',
  'Microsoft.People': 'Люди',
  'Microsoft.RemoteDesktop': 'Удалённый рабочий стол',
  'Microsoft.ScreenSketch': 'Ножницы (Snipping Tool)',
  'Microsoft.StartExperiencesApp': 'Виджеты (Start Experiences)',
  'Microsoft.Whiteboard': 'Whiteboard',
  'Microsoft.Windows.Photos': 'Фотографии',
  'Microsoft.WindowsCalculator': 'Калькулятор',
  'Microsoft.WindowsCamera': 'Камера',
  'microsoft.windowscommunicationsapps': 'Почта и Календарь',
  'Microsoft.windowscommunicationsapps': 'Почта и Календарь',
  'Microsoft.WindowsNotepad': 'Блокнот',
  'Microsoft.WindowsStore': 'Microsoft Store',
  'Microsoft.WindowsTerminal': 'Windows Terminal',
  'Microsoft.Xbox.TCUI': 'Xbox TCUI',
  'Microsoft.XboxGameOverlay': 'Xbox Game Overlay',
  'Microsoft.XboxGamingOverlay': 'Xbox Gaming Overlay / Game Bar',
  'Microsoft.XboxIdentityProvider': 'Xbox Identity Provider',
  'Microsoft.XboxSpeechToTextOverlay': 'Xbox Speech to Text',
  'Microsoft.YourPhone': 'Связь с телефоном',
  'Microsoft.ZuneMusic': 'Media Player',
  'MicrosoftWindows.CrossDevice': 'Cross Device',
  'MicrosoftWindows.Client.WebExperience': 'Web Experience Pack (виджеты)',
  'Microsoft.WidgetsPlatformRuntime': 'Widgets Platform Runtime',
  'Microsoft.Copilot': 'Copilot',
}

const defaultKeepIds = new Set([
  'Microsoft.WindowsStore',
  'Microsoft.WindowsCalculator',
  'Microsoft.WindowsNotepad',
  'Microsoft.WindowsTerminal',
  'Microsoft.Windows.Photos',
  'Microsoft.ScreenSketch',
  'Microsoft.ZuneMusic',
])

const apps = j.Apps.filter((a) => a.RemovalMethod === 'Appx')

function toKeepId(appId, used) {
  const parts = String(appId)
    .replace(/[^A-Za-z0-9.]+/g, '')
    .split('.')
    .filter(Boolean)
  let base = parts[parts.length - 1] || 'app'
  base = base.replace(/[^A-Za-z0-9]/g, '')
  if (!base) base = 'app'
  if (/^\d/.test(base)) base = 'x' + base
  base = base.charAt(0).toLowerCase() + base.slice(1)
  if (base.length > 28) base = base.slice(0, 28)
  let id = base
  let n = 2
  while (used.has(id)) {
    id = base + n
    n++
  }
  used.add(id)
  return id
}

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

const used = new Set(['edge'])
const catalog = []
const packages = []

catalog.push({
  id: 'edge',
  labelRu: 'Microsoft Edge',
  labelEn: 'Microsoft Edge',
  locked: false,
  defaultKeep: true,
})

for (const a of apps) {
  const appId = a.AppId
  const id = toKeepId(appId, used)
  catalog.push({
    id,
    labelRu: ruMap[appId] || a.FriendlyName,
    labelEn: a.FriendlyName,
    defaultKeep: defaultKeepIds.has(appId),
  })
  packages.push({ packageId: appId, removeUnless: id })
}

if (!packages.some((p) => p.packageId === 'Microsoft.Copilot')) {
  const id = toKeepId('Microsoft.Copilot', used)
  catalog.push({
    id,
    labelRu: 'Copilot (AppX)',
    labelEn: 'Copilot (AppX)',
    defaultKeep: false,
  })
  packages.push({ packageId: 'Microsoft.Copilot', removeUnless: id })
}

const keepIds = catalog.map((c) => c.id)

const types = `export type ImageLanguage = 'ru-RU' | 'en-US'
export type Edition = 'Pro' | 'Home' | 'Enterprise'
export type DiskMode = 'interactive' | 'wipe0'
export type ExpressPrivacy = 'disable-all' | 'default'

export type UnattendConfig = {
  language: ImageLanguage
  keyboards: Array<'ru' | 'en'>
  timezone: string
  edition: Edition
  productKeyMode: 'none' | 'generic' | 'custom'
  productKeyCustom: string
  diskMode: DiskMode
  windowsGb: number
  labelC: string
  labelD: string
  computerName: string
  userName: string
  password: string
  autoLogon: boolean
  keepApps: KeepAppId[]
  disableWidgets: boolean
  disableConsumerFeatures: boolean
  expressPrivacy: ExpressPrivacy
}

/** Whitelist ids: checked = keep, unchecked = remove on first logon. */
export type KeepAppId =
${keepIds.map((id) => `  | '${id}'`).join('\n')}

export type AppCatalogEntry = {
  id: KeepAppId
  labelRu: string
  labelEn: string
  locked?: boolean
  defaultKeep?: boolean
}

/** Full AppX catalog based on Win11Debloat Apps.json (Appx method). */
export const APP_CATALOG: AppCatalogEntry[] = [
${catalog
  .map((c) => {
    const locked = c.locked ? ', locked: true' : ''
    const dk = c.defaultKeep ? ', defaultKeep: true' : ''
    return `  { id: '${c.id}', labelRu: '${esc(c.labelRu)}', labelEn: '${esc(c.labelEn)}'${locked}${dk} },`
  })
  .join('\n')}
]

export const NAV_SECTIONS = [
  { id: 'language', ru: 'Язык', en: 'Language' },
  { id: 'edition', ru: 'Редакция', en: 'Edition' },
  { id: 'disk', ru: 'Диск', en: 'Disk' },
  { id: 'account', ru: 'Учётная запись', en: 'Account' },
  { id: 'apps', ru: 'Приложения', en: 'Apps' },
  { id: 'tweaks', ru: 'Твики', en: 'Tweaks' },
  { id: 'download', ru: 'Скачать', en: 'Download' },
] as const
`

const pkgBlock = `/** Packages removed unless the linked keep-id is checked. Sourced from Win11Debloat Apps.json (Appx). */
export const BLOAT_PACKAGES: { id: string; removeUnless: KeepAppId }[] = [
${packages
  .map((p) => `  { id: '${esc(p.packageId)}', removeUnless: '${p.removeUnless}' },`)
  .join('\n')}
]
`

fs.writeFileSync('C:/Users/Admin/projects/wintool/src/lib/types.ts', types)
fs.writeFileSync('C:/Users/Admin/projects/wintool/src/lib/bloatPackages.ts', `import type { KeepAppId } from './types.ts'\n\n${pkgBlock}`)
console.log('ok', catalog.length, packages.length)
