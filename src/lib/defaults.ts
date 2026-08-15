import {
  APP_CATALOG,
  type KeepAppId,
  type UnattendConfig,
} from './types.ts'

export const ALL_KEEP_APPS: KeepAppId[] = APP_CATALOG.map((a) => a.id)

/** Essentials for the “Только нужное” button (not applied on first load). */
export const DEFAULT_KEEP_APPS: KeepAppId[] = APP_CATALOG.filter(
  (a) => a.defaultKeep || a.locked,
).map((a) => a.id)

export const defaultConfig: UnattendConfig = {
  language: 'ru-RU',
  keyboards: ['ru', 'en'],
  timezone: 'Russian Standard Time',
  edition: 'Pro',
  productKeyMode: 'none',
  productKeyCustom: '',
  diskMode: 'interactive',
  windowsGb: 150,
  labelC: 'Windows',
  labelD: 'Data',
  computerName: '',
  userName: '',
  password: '',
  autoLogon: false,
  keepApps: [],
  disableWidgets: false,
  disableConsumerFeatures: false,
  expressPrivacy: 'default',
  showFileExtensions: false,
  showHiddenFiles: false,
  taskbarSearchHidden: false,
  taskbarAlignLeft: false,
  disableOneDrive: false,
  disableHibernation: false,
  disableGameDvr: false,
  enableLongPaths: false,
  numLockOn: false,
  disableTelemetry: false,
}
