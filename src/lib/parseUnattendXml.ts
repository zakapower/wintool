import { BLOAT_PACKAGES } from './bloatPackages.ts'
import { ALL_KEEP_APPS, defaultConfig } from './defaults.ts'
import type { Edition, KeepAppId, UnattendConfig } from './types.ts'

const SUPPORTED_COMPONENTS = new Set([
  'Microsoft-Windows-International-Core-WinPE',
  'Microsoft-Windows-Setup',
  'Microsoft-Windows-Shell-Setup',
  'Microsoft-Windows-International-Core',
])

const GENERIC_KEYS: Record<string, Edition> = {
  'VK7JG-NPHTM-C97JM-9MPGT-3V66T': 'Pro',
  'YTMG3-N6DKC-DKB77-7M9GH-8HVX7': 'Home',
  'XGVPP-NMH47-7TTHJ-W3FW7-8HV2C': 'Enterprise',
}

export type ImportUnattendResult =
  | { ok: true; config: UnattendConfig }
  | { ok: false; error: string; unsupported: string[] }

type TagMatch = { attrs: string; inner: string }

function tagRe(name: string, flags = 'gi'): RegExp {
  return new RegExp(
    `<(?:[\\w.-]+:)?${name}\\b([^>]*)>([\\s\\S]*?)</(?:[\\w.-]+:)?${name}\\s*>`,
    flags,
  )
}

function allTags(xml: string, name: string): TagMatch[] {
  const out: TagMatch[] = []
  const re = tagRe(name)
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    out.push({ attrs: m[1] ?? '', inner: m[2] ?? '' })
  }
  return out
}

function firstTag(xml: string, name: string): TagMatch | null {
  const m = tagRe(name, 'i').exec(xml)
  return m ? { attrs: m[1] ?? '', inner: m[2] ?? '' } : null
}

function textOf(xml: string, name: string): string {
  const t = firstTag(xml, name)
  if (!t) return ''
  return t.inner.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

function attr(attrs: string, name: string): string {
  const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i').exec(attrs)
  return (m?.[1] ?? '').trim()
}

function decodeEncodedCommand(cmd: string): string | null {
  const m = cmd.match(/-EncodedCommand\s+([A-Za-z0-9+/=]+)/i)
  if (!m) return null
  try {
    const b64 = m[1]
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64, 'base64').toString('utf16le')
    }
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new TextDecoder('utf-16le').decode(bytes)
  } catch {
    return null
  }
}

function parseKeepAppsFromScript(script: string): KeepAppId[] {
  const removed = new Set<string>()
  for (const pkg of BLOAT_PACKAGES) {
    if (script.includes(`"${pkg.id}"`) || script.includes(`'${pkg.id}'`)) {
      removed.add(pkg.id)
    }
  }
  const keep = ALL_KEEP_APPS.filter((id) => {
    const pkgs = BLOAT_PACKAGES.filter((p) => p.removeUnless === id)
    if (!pkgs.length) return true
    return pkgs.every((p) => !removed.has(p.id))
  })
  if (/Get-AppxPackage -AllUsers \*Edge\*/i.test(script)) {
    return keep.filter((id) => id !== 'edge')
  }
  return keep
}

function mapEdition(name: string): Edition | null {
  if (/Enterprise/i.test(name)) return 'Enterprise'
  if (/Home/i.test(name)) return 'Home'
  if (/Pro/i.test(name)) return 'Pro'
  return null
}

function detectUnsupported(xml: string, lang: 'ru' | 'en'): string[] {
  const t = (ru: string, en: string) => (lang === 'ru' ? ru : en)
  const out: string[] = []

  for (const c of allTags(xml, 'component')) {
    const name = attr(c.attrs, 'name')
    if (name && !SUPPORTED_COMPONENTS.has(name)) {
      out.push(name)
    }
  }

  if (
    /<(?:[\w.-]+:)?(?:UnattendedJoin|Identification|JoinDomain|MachineObjectOU)\b/i.test(
      xml,
    )
  ) {
    out.push(t('Вступление в домен', 'Domain join'))
  }
  if (/<(?:[\w.-]+:)?(?:WLANConnection|WirelessGroup)\b/i.test(xml)) {
    out.push(t('Wi‑Fi / беспроводная сеть', 'Wi‑Fi / wireless'))
  }
  if (
    /<(?:[\w.-]+:)?(?:CopyProfile|PersistAllDeviceInstalls)\b/i.test(xml)
  ) {
    out.push(t('CopyProfile / спец. опции Setup', 'CopyProfile / specialized setup'))
  }
  if (/<(?:[\w.-]+:)?RunSynchronous\b/i.test(xml)) {
    out.push('RunSynchronous')
  }

  const accounts = allTags(xml, 'LocalAccount')
  if (accounts.length > 1) {
    out.push(t('Несколько локальных пользователей', 'Multiple local accounts'))
  }

  const disk = firstTag(xml, 'DiskConfiguration')
  if (disk) {
    const wipe = /<(?:[\w.-]+:)?WillWipeDisk\b[^>]*>\s*true\s*</i.test(
      disk.inner,
    )
    const createCount = allTags(disk.inner, 'CreatePartition').length
    if (!wipe || createCount !== 4) {
      out.push(t('Нестандартная разметка диска', 'Custom disk layout'))
    }
  }

  const cmds = allTags(xml, 'SynchronousCommand')
  for (const cmd of cmds) {
    const desc = textOf(cmd.inner, 'Description')
    if (desc && !/^(WinTools|Wintool)\s+debloat$/i.test(desc)) {
      out.push(`FirstLogon: ${desc}`)
    }
  }
  if (cmds.length > 1) {
    out.push(t('Несколько FirstLogonCommands', 'Multiple FirstLogonCommands'))
  }

  return [...new Set(out)]
}

export function parseUnattendXml(
  xml: string,
  lang: 'ru' | 'en' = 'ru',
): ImportUnattendResult {
  const t = (ru: string, en: string) => (lang === 'ru' ? ru : en)
  const trimmed = xml.trim()
  if (!trimmed) {
    return {
      ok: false,
      error: t('Файл пустой', 'File is empty'),
      unsupported: [],
    }
  }

  if (!/<(?:[\w.-]+:)?unattend\b/i.test(trimmed)) {
    return {
      ok: false,
      error: t(
        'Это не файл autounattend.xml (нет корня unattend)',
        'Not an autounattend.xml file (missing unattend root)',
      ),
      unsupported: [],
    }
  }

  const unsupported = detectUnsupported(trimmed, lang)
  if (unsupported.length) {
    return {
      ok: false,
      error: t(
        'В файле есть настройки, которые нельзя задать на сайте. Загрузка отменена.',
        'The file has settings that cannot be configured on this site. Import cancelled.',
      ),
      unsupported,
    }
  }

  const cfg: UnattendConfig = {
    ...defaultConfig,
    keyboards: [...defaultConfig.keyboards],
    keepApps: [...defaultConfig.keepApps],
  }

  const uiLang =
    textOf(trimmed, 'UILanguage') || textOf(trimmed, 'SystemLocale')
  if (uiLang === 'ru-RU' || uiLang === 'en-US') cfg.language = uiLang

  const inputLocale = textOf(trimmed, 'InputLocale')
  const keys: Array<'ru' | 'en'> = []
  if (/0419/.test(inputLocale)) keys.push('ru')
  if (/0409/.test(inputLocale)) keys.push('en')
  if (keys.length) cfg.keyboards = keys

  const tz = textOf(trimmed, 'TimeZone')
  if (tz) cfg.timezone = tz

  for (const md of allTags(trimmed, 'MetaData')) {
    if (textOf(md.inner, 'Key').includes('/IMAGE/NAME')) {
      const ed = mapEdition(textOf(md.inner, 'Value'))
      if (ed) cfg.edition = ed
    }
  }

  const productKey = textOf(trimmed, 'ProductKey')
  if (!productKey) {
    cfg.productKeyMode = 'none'
    cfg.productKeyCustom = ''
  } else if (GENERIC_KEYS[productKey]) {
    cfg.productKeyMode = 'generic'
    cfg.productKeyCustom = ''
    cfg.edition = GENERIC_KEYS[productKey]
  } else {
    cfg.productKeyMode = 'custom'
    cfg.productKeyCustom = productKey
  }

  if (/<(?:[\w.-]+:)?WillWipeDisk\b/i.test(trimmed)) {
    cfg.diskMode = 'wipe0'
    for (const part of allTags(trimmed, 'CreatePartition')) {
      if (textOf(part.inner, 'Order') === '3') {
        const sizeMb = Number(textOf(part.inner, 'Size'))
        if (Number.isFinite(sizeMb) && sizeMb > 0) {
          cfg.windowsGb = Math.round(sizeMb / 1024)
        }
      }
    }
    for (const mp of allTags(trimmed, 'ModifyPartition')) {
      const letter = textOf(mp.inner, 'Letter').toUpperCase()
      const label = textOf(mp.inner, 'Label')
      if (letter === 'C' && label) cfg.labelC = label
      if (letter === 'D' && label) cfg.labelD = label
    }
  } else if (/<(?:[\w.-]+:)?InstallToAvailablePartition\b/i.test(trimmed)) {
    cfg.diskMode = 'interactive'
  }

  cfg.computerName = textOf(trimmed, 'ComputerName')

  const local = firstTag(trimmed, 'LocalAccount')
  if (local) {
    cfg.userName = textOf(local.inner, 'Name')
    const pwd = firstTag(local.inner, 'Password')
    cfg.password = pwd ? textOf(pwd.inner, 'Value') : ''
  }

  const auto = firstTag(trimmed, 'AutoLogon')
  cfg.autoLogon =
    !!auto && /<(?:[\w.-]+:)?Enabled\b[^>]*>\s*true\s*</i.test(auto.inner)

  const protect = textOf(trimmed, 'ProtectYourPC')
  cfg.expressPrivacy = protect === '3' ? 'disable-all' : 'default'

  const cmd = firstTag(trimmed, 'SynchronousCommand')
  if (cmd) {
    const cmdLine = textOf(cmd.inner, 'CommandLine')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
    const script = decodeEncodedCommand(cmdLine)
    if (!script) {
      return {
        ok: false,
        error: t(
          'Не удалось разобрать FirstLogon-скрипт. Загрузка отменена.',
          'Could not decode FirstLogon script. Import cancelled.',
        ),
        unsupported: [t('Неизвестный FirstLogon-скрипт', 'Unknown FirstLogon script')],
      }
    }
    cfg.keepApps = parseKeepAppsFromScript(script)
    cfg.disableWidgets = /AllowNewsAndInterests/.test(script)
    cfg.disableConsumerFeatures = /DisableWindowsConsumerFeatures/.test(script)
    cfg.showFileExtensions = /HideFileExt/.test(script)
    cfg.showHiddenFiles = /\/v Hidden /.test(script)
    cfg.taskbarSearchHidden = /SearchboxTaskbarMode/.test(script)
    cfg.taskbarAlignLeft = /TaskbarAl/.test(script)
    cfg.taskbarHideTaskView = /ShowTaskViewButton/.test(script)
    cfg.taskbarHideChat = /TaskbarMn/.test(script)
    cfg.taskbarHideWidgets = /TaskbarDa/.test(script)
    cfg.taskbarShowSeconds = /ShowSecondsInSystemClock/.test(script)
    cfg.taskbarEndTask = /TaskbarEndTask/.test(script)
    cfg.disableGameDvr = /GameDVR/.test(script)
    cfg.enableLongPaths = /LongPathsEnabled/.test(script)
    cfg.numLockOn = /InitialKeyboardIndicators/.test(script)
    cfg.disableTelemetry = /AllowTelemetry/.test(script)
    cfg.disableOneDrive = /OneDriveSetup\.exe/.test(script)
    cfg.disableHibernation = /powercfg \/h off/i.test(script)
  }

  return { ok: true, config: cfg }
}
