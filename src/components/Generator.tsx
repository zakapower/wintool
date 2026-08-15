'use client'

import { useMemo, useRef, useState } from 'react'
import { Download, RotateCcw, Upload } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { defaultConfig } from '@/lib/defaults'
import { validateConfig } from '@/lib/buildUnattendXml'
import { parseUnattendXml } from '@/lib/parseUnattendXml'
import {
  APP_CATALOG,
  NAV_SECTIONS,
  type KeepAppId,
  type UnattendConfig,
} from '@/lib/types'
import { FieldSelect } from './FieldSelect'
import { SideNav, useActiveSection } from './SideNav'
import './Generator.css'

const SECTION_IDS = NAV_SECTIONS.map((s) => s.id)

export function Generator() {
  const { lang, t } = useApp()
  const [cfg, setCfg] = useState<UnattendConfig>(defaultConfig)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importUnsupported, setImportUnsupported] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeId, setActiveId] = useActiveSection(SECTION_IDS)
  const clientErrors = useMemo(() => validateConfig(cfg, lang), [cfg, lang])

  const languageOptions = [
    { value: 'ru-RU', label: t('Русский (ru-RU)', 'Russian (ru-RU)') },
    { value: 'en-US', label: 'English (en-US)' },
  ]

  const timezoneOptions = [
    { value: 'Russian Standard Time', label: t('Москва (UTC+3)', 'Moscow (UTC+3)') },
    { value: 'UTC', label: 'UTC' },
    { value: 'Pacific Standard Time', label: 'Pacific (US)' },
  ]

  const editionOptions = [
    { value: 'Pro', label: 'Windows 11 Pro' },
    { value: 'Home', label: 'Windows 11 Home' },
    { value: 'Enterprise', label: 'Windows 11 Enterprise' },
  ]

  const privacyOptions = [
    {
      value: 'disable-all',
      label: t('Минимум данных Microsoft', 'Minimize Microsoft data'),
    },
    {
      value: 'default',
      label: t('По умолчанию Windows', 'Windows defaults'),
    },
  ]

  function patch<K extends keyof UnattendConfig>(key: K, value: UnattendConfig[K]) {
    setCfg((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  function toggleKeep(id: KeepAppId) {
    const locked = APP_CATALOG.find((a) => a.id === id)?.locked
    if (locked) return
    setCfg((prev) => {
      const has = prev.keepApps.includes(id)
      return {
        ...prev,
        keepApps: has
          ? prev.keepApps.filter((x) => x !== id)
          : [...prev.keepApps, id],
      }
    })
  }

  function keepAllApps() {
    setCfg((prev) => ({
      ...prev,
      keepApps: APP_CATALOG.map((a) => a.id),
    }))
  }

  function keepEssentialApps() {
    setCfg((prev) => ({
      ...prev,
      keepApps: APP_CATALOG.filter((a) => a.defaultKeep || a.locked).map(
        (a) => a.id,
      ),
    }))
  }

  function clearAllApps() {
    setCfg((prev) => ({
      ...prev,
      keepApps: APP_CATALOG.filter((a) => a.locked).map((a) => a.id),
    }))
  }

  function toggleKeyboard(k: 'ru' | 'en') {
    setCfg((prev) => {
      const has = prev.keyboards.includes(k)
      if (has && prev.keyboards.length === 1) return prev
      return {
        ...prev,
        keyboards: has
          ? prev.keyboards.filter((x) => x !== k)
          : [...prev.keyboards, k],
      }
    })
  }

  function goToError(targetId: string) {
    const el = document.getElementById(targetId)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const focusable =
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
        ? el
        : el.querySelector<HTMLElement>(
            'input:not([type="hidden"]), textarea, button, [tabindex]:not([tabindex="-1"])',
          )
    window.setTimeout(() => focusable?.focus({ preventScroll: true }), 350)
  }

  function resetAll() {
    setCfg({
      ...defaultConfig,
      keyboards: [...defaultConfig.keyboards],
      keepApps: [...defaultConfig.keepApps],
    })
    setError(null)
    setImportError(null)
    setImportUnsupported([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onImportFile(file: File | undefined) {
    if (!file) return
    setImportError(null)
    setImportUnsupported([])
    setError(null)
    try {
      const text = await file.text()
      const result = parseUnattendXml(text, lang)
      if (!result.ok) {
        setImportError(result.error)
        setImportUnsupported(result.unsupported)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      setCfg({
        ...result.config,
        keyboards: [...result.config.keyboards],
        keepApps: [...result.config.keepApps],
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setImportError(
        t('Не удалось прочитать файл', 'Could not read the file'),
      )
      setImportUnsupported([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function download() {
    const errs = validateConfig(cfg, lang)
    if (errs.length) {
      setError(errs.map((e) => e.message).join('; '))
      document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(
          data?.error || t(`Ошибка ${res.status}`, `Error ${res.status}`),
        )
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'autounattend.xml'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('Не удалось скачать', 'Download failed'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="generator">
      <aside className="generator__aside">
        <SideNav activeId={activeId} onNavigate={setActiveId} />
      </aside>

      <div className="generator__main">
        <header className="generator__intro">
          <h1 className="generator__title">
            {t('Генератор autounattend.xml', 'autounattend.xml generator')}
          </h1>
          <p className="generator__lead">
            {t(
              'Настройте блоки слева по якорям, скачайте файл и положите в корень установочной флешки Windows.',
              'Use the sections on the left, download the file, and put it in the root of your Windows install USB.',
            )}
          </p>
          <div className="generator__actions">
            <button
              type="button"
              className="btn btn--ghost generator__reset"
              onClick={resetAll}
            >
              <RotateCcw size={18} strokeWidth={2.25} aria-hidden />
              {t('Сбросить', 'Reset')}
            </button>
            <button
              type="button"
              className="btn btn--ghost generator__reset"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={18} strokeWidth={2.25} aria-hidden />
              {t('Загрузить XML', 'Upload XML')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              className="generator__file"
              aria-label={t(
                'Загрузить свой autounattend.xml',
                'Upload your autounattend.xml',
              )}
              onChange={(e) => void onImportFile(e.target.files?.[0])}
            />
          </div>
          {importError ? (
            <div className="form-error generator__import-error" role="alert">
              <p>{importError}</p>
              {importUnsupported.length > 0 ? (
                <ul className="generator__import-list">
                  {importUnsupported.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </header>

        <section id="language" className="block">
          <h2 className="block__title">{t('Язык и регион', 'Language & region')}</h2>
          <div className="field">
            <span className="field__label">{t('Язык Windows', 'Windows language')}</span>
            <FieldSelect
              aria-label={t('Язык Windows', 'Windows language')}
              value={cfg.language}
              options={languageOptions}
              onChange={(v) => patch('language', v as UnattendConfig['language'])}
            />
          </div>
          <fieldset className="field" id="field-keyboards">
            <legend className="field__label">{t('Раскладки', 'Keyboards')}</legend>
            <div className="choices choices--row">
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.keyboards.includes('ru')}
                  onChange={() => toggleKeyboard('ru')}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">{t('Русская', 'Russian')}</span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.keyboards.includes('en')}
                  onChange={() => toggleKeyboard('en')}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">English</span>
              </label>
            </div>
          </fieldset>
          <div className="field">
            <span className="field__label">{t('Часовой пояс', 'Time zone')}</span>
            <FieldSelect
              aria-label={t('Часовой пояс', 'Time zone')}
              value={cfg.timezone}
              options={timezoneOptions}
              onChange={(v) => patch('timezone', v)}
            />
          </div>
        </section>

        <section id="edition" className="block">
          <h2 className="block__title">{t('Редакция и ключ', 'Edition & key')}</h2>
          <div className="field">
            <span className="field__label">{t('Редакция', 'Edition')}</span>
            <FieldSelect
              aria-label={t('Редакция', 'Edition')}
              value={cfg.edition}
              options={editionOptions}
              onChange={(v) => patch('edition', v as UnattendConfig['edition'])}
            />
          </div>
          <fieldset className="field">
            <legend className="field__label">{t('Ключ продукта', 'Product key')}</legend>
            <div className="choices">
              <label className="choice">
                <input
                  type="radio"
                  name="keyMode"
                  checked={cfg.productKeyMode === 'none'}
                  onChange={() => patch('productKeyMode', 'none')}
                />
                <span className="choice__mark choice__mark--radio" aria-hidden />
                <span className="choice__text">
                  {t('Без ключа в файле', 'No key in the file')}
                </span>
              </label>
              <label className="choice">
                <input
                  type="radio"
                  name="keyMode"
                  checked={cfg.productKeyMode === 'generic'}
                  onChange={() => patch('productKeyMode', 'generic')}
                />
                <span className="choice__mark choice__mark--radio" aria-hidden />
                <span className="choice__text">
                  {t(
                    'Generic (установка без активации)',
                    'Generic (install without activation)',
                  )}
                </span>
              </label>
              <label className="choice">
                <input
                  type="radio"
                  name="keyMode"
                  checked={cfg.productKeyMode === 'custom'}
                  onChange={() => patch('productKeyMode', 'custom')}
                />
                <span className="choice__mark choice__mark--radio" aria-hidden />
                <span className="choice__text">{t('Свой ключ', 'Custom key')}</span>
              </label>
            </div>
            {cfg.productKeyMode === 'custom' && (
              <input
                id="field-product-key"
                className="field__control"
                type="text"
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                value={cfg.productKeyCustom}
                onChange={(e) => patch('productKeyCustom', e.target.value)}
                autoComplete="off"
              />
            )}
          </fieldset>
        </section>

        <section id="disk" className="block">
          <h2 className="block__title">{t('Диск', 'Disk')}</h2>
          <div className="warn" role="status">
            {t(
              'Режим «стереть Диск 0» уничтожит все данные на первом диске. Проверь, что это нужный SSD/HDD.',
              '“Wipe Disk 0” will erase all data on the first disk. Make sure it is the intended SSD/HDD.',
            )}
          </div>
          <fieldset className="field">
            <legend className="field__label">{t('Режим', 'Mode')}</legend>
            <div className="choices">
              <label className="choice">
                <input
                  type="radio"
                  name="diskMode"
                  checked={cfg.diskMode === 'interactive'}
                  onChange={() => patch('diskMode', 'interactive')}
                />
                <span className="choice__mark choice__mark--radio" aria-hidden />
                <span className="choice__text">
                  {t(
                    'Выбрать раздел вручную в Setup',
                    'Pick the partition manually in Setup',
                  )}
                </span>
              </label>
              <label className="choice">
                <input
                  type="radio"
                  name="diskMode"
                  checked={cfg.diskMode === 'wipe0'}
                  onChange={() => patch('diskMode', 'wipe0')}
                />
                <span className="choice__mark choice__mark--radio" aria-hidden />
                <span className="choice__text">
                  {t(
                    'Стереть Диск 0 и разметить автоматически',
                    'Wipe Disk 0 and partition automatically',
                  )}
                </span>
              </label>
            </div>
          </fieldset>
          {cfg.diskMode === 'wipe0' && (
            <>
              <label className="field">
                <span className="field__label">{t('Размер C: (ГБ)', 'C: size (GB)')}</span>
                <input
                  id="field-windows-gb"
                  className="field__control"
                  type="number"
                  min={40}
                  max={2000}
                  value={cfg.windowsGb}
                  onChange={(e) => patch('windowsGb', Number(e.target.value) || 0)}
                />
              </label>
              <label className="field">
                <span className="field__label">{t('Метка C:', 'C: label')}</span>
                <input
                  className="field__control"
                  value={cfg.labelC}
                  onChange={(e) => patch('labelC', e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field__label">
                  {t('Метка D: (остаток)', 'D: label (remaining)')}
                </span>
                <input
                  className="field__control"
                  value={cfg.labelD}
                  onChange={(e) => patch('labelD', e.target.value)}
                />
              </label>
            </>
          )}
        </section>

        <section id="account" className="block">
          <h2 className="block__title">
            {t('Компьютер и пользователь', 'Computer & user')}
          </h2>
          <label className="field">
            <span className="field__label">{t('Имя компьютера', 'Computer name')}</span>
            <input
              id="field-computer-name"
              className="field__control"
              value={cfg.computerName}
              onChange={(e) => patch('computerName', e.target.value)}
              maxLength={15}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              suppressHydrationWarning
            />
          </label>
          <label className="field">
            <span className="field__label">
              {t('Локальный пользователь', 'Local user')}
            </span>
            <input
              id="field-user-name"
              className="field__control"
              value={cfg.userName}
              onChange={(e) => patch('userName', e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              suppressHydrationWarning
            />
          </label>
          <label className="field">
            <span className="field__label">
              {t('Пароль (можно пустой)', 'Password (can be empty)')}
            </span>
            <input
              className="field__control"
              type="password"
              value={cfg.password}
              onChange={(e) => patch('password', e.target.value)}
              autoComplete="off"
              name="wintool-local-password"
              data-1p-ignore
              data-lpignore="true"
              suppressHydrationWarning
            />
          </label>
          <label className="choice">
            <input
              type="checkbox"
              checked={cfg.autoLogon}
              onChange={(e) => patch('autoLogon', e.target.checked)}
            />
            <span className="choice__mark" aria-hidden />
            <span className="choice__text">
              {t(
                'Автоматический вход при первом запуске',
                'Automatic logon on first boot',
              )}
            </span>
          </label>
        </section>

        <section id="apps" className="block">
          <h2 className="block__title">{t('Приложения', 'Apps')}</h2>
          <p className="block__hint">
            {t(
              'Отметь, что оставить. Снятые пункты удалятся при первом входе (AppX). Список: встроенные приложения Microsoft/Windows и типичный OEM. Edge можно снять.',
              'Check what to keep. Unchecked apps are removed on first logon (AppX). Catalog: Microsoft/Windows inbox apps and common OEM. Edge can be removed.',
            )}
          </p>
          <div className="apps-toolbar">
            <button type="button" className="btn btn--ghost" onClick={keepEssentialApps}>
              {t('Базовый набор', 'Basic set')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={keepAllApps}>
              {t('Добавить все', 'Select all')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={clearAllApps}>
              {t('Убрать все', 'Deselect all')}
            </button>
          </div>
          <div className="choices choices--apps">
            {APP_CATALOG.map((app) => (
              <label
                key={app.id}
                className={`choice${app.locked ? ' choice--disabled' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={cfg.keepApps.includes(app.id)}
                  disabled={app.locked}
                  onChange={() => toggleKeep(app.id)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {lang === 'ru' ? app.labelRu : app.labelEn}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section id="tweaks" className="block">
          <h2 className="block__title">{t('Твики', 'Tweaks')}</h2>

          <div className="tweak-group">
            <h3 className="tweak-group__title">
              {t('Приватность и предложения', 'Privacy & suggestions')}
            </h3>
            <div className="choices choices--tweaks">
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.disableWidgets}
                  onChange={(e) => patch('disableWidgets', e.target.checked)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Отключить виджеты / новости', 'Disable widgets / news')}
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.disableConsumerFeatures}
                  onChange={(e) =>
                    patch('disableConsumerFeatures', e.target.checked)
                  }
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t(
                    'Меньше предложений приложений',
                    'Fewer app suggestions',
                  )}
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.disableTelemetry}
                  onChange={(e) => patch('disableTelemetry', e.target.checked)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Ограничить телеметрию', 'Limit telemetry')}
                </span>
              </label>
            </div>
            <div className="field">
              <span className="field__label">
                {t('Конфиденциальность (Express)', 'Privacy (Express)')}
              </span>
              <FieldSelect
                aria-label={t('Конфиденциальность', 'Privacy')}
                value={cfg.expressPrivacy}
                options={privacyOptions}
                onChange={(v) =>
                  patch('expressPrivacy', v as UnattendConfig['expressPrivacy'])
                }
              />
            </div>
          </div>

          <div className="tweak-group">
            <h3 className="tweak-group__title">
              {t('Проводник', 'File Explorer')}
            </h3>
            <div className="choices choices--tweaks">
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.showFileExtensions}
                  onChange={(e) => patch('showFileExtensions', e.target.checked)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Показывать расширения файлов', 'Show file extensions')}
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.showHiddenFiles}
                  onChange={(e) => patch('showHiddenFiles', e.target.checked)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Показывать скрытые файлы', 'Show hidden files')}
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.enableLongPaths}
                  onChange={(e) => patch('enableLongPaths', e.target.checked)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Длинные пути (>260)', 'Long paths (>260)')}
                </span>
              </label>
            </div>
          </div>

          <div className="tweak-group">
            <h3 className="tweak-group__title">
              {t('Панель задач', 'Taskbar')}
            </h3>
            <div className="choices choices--tweaks">
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.taskbarSearchHidden}
                  onChange={(e) => patch('taskbarSearchHidden', e.target.checked)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Скрыть поиск на панели задач', 'Hide taskbar search')}
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.taskbarAlignLeft}
                  onChange={(e) => patch('taskbarAlignLeft', e.target.checked)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Панель задач слева', 'Taskbar align left')}
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.taskbarHideTaskView}
                  onChange={(e) =>
                    patch('taskbarHideTaskView', e.target.checked)
                  }
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Скрыть «Просмотр задач»', 'Hide Task View')}
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.taskbarHideChat}
                  onChange={(e) => patch('taskbarHideChat', e.target.checked)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Скрыть чат / Teams', 'Hide Chat / Teams')}
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.taskbarHideWidgets}
                  onChange={(e) =>
                    patch('taskbarHideWidgets', e.target.checked)
                  }
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Скрыть виджеты на панели', 'Hide taskbar widgets')}
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.taskbarShowSeconds}
                  onChange={(e) =>
                    patch('taskbarShowSeconds', e.target.checked)
                  }
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Секунды на часах', 'Show seconds on clock')}
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.taskbarEndTask}
                  onChange={(e) => patch('taskbarEndTask', e.target.checked)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('«Завершить задачу» в меню', 'End task in taskbar menu')}
                </span>
              </label>
            </div>
          </div>

          <div className="tweak-group">
            <h3 className="tweak-group__title">
              {t('Система', 'System')}
            </h3>
            <div className="choices choices--tweaks">
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.disableGameDvr}
                  onChange={(e) => patch('disableGameDvr', e.target.checked)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Отключить Game DVR', 'Disable Game DVR')}
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.numLockOn}
                  onChange={(e) => patch('numLockOn', e.target.checked)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('NumLock при входе', 'NumLock on at logon')}
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.disableOneDrive}
                  onChange={(e) => patch('disableOneDrive', e.target.checked)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Удалить OneDrive', 'Uninstall OneDrive')}
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={cfg.disableHibernation}
                  onChange={(e) => patch('disableHibernation', e.target.checked)}
                />
                <span className="choice__mark" aria-hidden />
                <span className="choice__text">
                  {t('Отключить гибернацию', 'Disable hibernation')}
                </span>
              </label>
            </div>
          </div>
        </section>

        <section id="download" className="block block--download">
          <h2 className="block__title">
            {t('Обзор и скачивание', 'Review & download')}
          </h2>
          <dl className="summary">
            <div className="summary__row">
              <dt>{t('Язык Windows', 'Windows language')}</dt>
              <dd>{cfg.language}</dd>
            </div>
            <div className="summary__row">
              <dt>{t('Раскладки', 'Keyboards')}</dt>
              <dd>
                {cfg.keyboards
                  .map((k) => (k === 'ru' ? t('Русская', 'Russian') : 'English'))
                  .join(', ')}
              </dd>
            </div>
            <div className="summary__row">
              <dt>{t('Часовой пояс', 'Time zone')}</dt>
              <dd>
                {cfg.timezone === 'Russian Standard Time'
                  ? t('Москва (UTC+3)', 'Moscow (UTC+3)')
                  : cfg.timezone}
              </dd>
            </div>
            <div className="summary__row">
              <dt>{t('Редакция', 'Edition')}</dt>
              <dd>Windows 11 {cfg.edition}</dd>
            </div>
            <div className="summary__row">
              <dt>{t('Ключ продукта', 'Product key')}</dt>
              <dd>
                {cfg.productKeyMode === 'none'
                  ? t('Без ключа', 'No key')
                  : cfg.productKeyMode === 'generic'
                    ? 'Generic'
                    : t('Свой ключ', 'Custom key')}
              </dd>
            </div>
            <div className="summary__row">
              <dt>{t('Диск', 'Disk')}</dt>
              <dd>
                {cfg.diskMode === 'wipe0'
                  ? t(
                      `Стереть Disk 0 → C: ${cfg.windowsGb} ГБ «${cfg.labelC}», D: остаток «${cfg.labelD}»`,
                      `Wipe Disk 0 → C: ${cfg.windowsGb} GB “${cfg.labelC}”, D: remaining “${cfg.labelD}”`,
                    )
                  : t('Раздел вручную в Setup', 'Pick partition in Setup')}
              </dd>
            </div>
            <div className="summary__row">
              <dt>{t('Имя ПК', 'PC name')}</dt>
              <dd>{cfg.computerName || '—'}</dd>
            </div>
            <div className="summary__row">
              <dt>{t('Пользователь', 'User')}</dt>
              <dd>
                {cfg.userName || '—'}
                {cfg.autoLogon
                  ? ` · ${t('автологин', 'auto logon')}`
                  : ` · ${t('без автологина', 'no auto logon')}`}
                {cfg.password
                  ? ` · ${t('с паролем', 'with password')}`
                  : ` · ${t('без пароля', 'no password')}`}
              </dd>
            </div>
            <div className="summary__row summary__row--apps">
              <dt>{t('Приложения', 'Apps')}</dt>
              <dd>
                {cfg.keepApps.length === 0 ? (
                  t(
                    'Ничего не отмечено: снять всё из списка',
                    'Nothing checked: remove everything in the list',
                  )
                ) : (
                  <ul className="summary__apps">
                    {APP_CATALOG.filter((a) => cfg.keepApps.includes(a.id)).map(
                      (a) => (
                        <li key={a.id}>
                          {lang === 'ru' ? a.labelRu : a.labelEn}
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </dd>
            </div>
            <div className="summary__row">
              <dt>{t('Твики', 'Tweaks')}</dt>
              <dd>
                {[
                  cfg.disableWidgets ? t('виджеты выкл.', 'widgets off') : null,
                  cfg.disableConsumerFeatures
                    ? t('меньше предложений', 'fewer suggestions')
                    : null,
                  cfg.disableTelemetry ? t('телеметрия↓', 'telemetry↓') : null,
                  cfg.showFileExtensions ? t('расширения', 'extensions') : null,
                  cfg.showHiddenFiles ? t('скрытые', 'hidden files') : null,
                  cfg.taskbarSearchHidden ? t('поиск скрыт', 'search hidden') : null,
                  cfg.taskbarAlignLeft ? t('панель слева', 'taskbar left') : null,
                  cfg.taskbarHideTaskView
                    ? t('без Task View', 'no Task View')
                    : null,
                  cfg.taskbarHideChat ? t('без чата', 'no chat') : null,
                  cfg.taskbarHideWidgets
                    ? t('виджеты на панели скрыты', 'taskbar widgets hidden')
                    : null,
                  cfg.taskbarShowSeconds ? t('секунды на часах', 'clock seconds') : null,
                  cfg.taskbarEndTask ? t('End task', 'End task') : null,
                  cfg.disableGameDvr ? t('Game DVR выкл.', 'Game DVR off') : null,
                  cfg.enableLongPaths ? t('long paths', 'long paths') : null,
                  cfg.numLockOn ? 'NumLock' : null,
                  cfg.disableOneDrive ? t('без OneDrive', 'no OneDrive') : null,
                  cfg.disableHibernation ? t('без гибернации', 'no hibernation') : null,
                  cfg.expressPrivacy === 'disable-all'
                    ? t('минимум данных', 'minimize data')
                    : t('приватность по умолчанию', 'default privacy'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </dd>
            </div>
          </dl>
          {clientErrors.length > 0 ? (
            <ul className="form-error" role="alert">
              {clientErrors.map((err) => (
                <li key={err.targetId}>
                  <button
                    type="button"
                    className="form-error__link"
                    onClick={() => goToError(err.targetId)}
                  >
                    {err.message}
                  </button>
                </li>
              ))}
            </ul>
          ) : error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            className="btn"
            disabled={busy || clientErrors.length > 0}
            onClick={download}
          >
            <Download size={18} strokeWidth={2.25} aria-hidden />
            {busy
              ? t('Генерация…', 'Generating…')
              : t('Скачать autounattend.xml', 'Download autounattend.xml')}
          </button>
        </section>
      </div>
    </div>
  )
}
