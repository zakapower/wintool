'use client'

import { useMemo, useRef, useState } from 'react'
import { Download, RotateCcw, Upload } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { defaultConfig } from '@/lib/defaults'
import { validateConfig } from '@/lib/buildUnattendXml'
import { parseUnattendXml } from '@/lib/parseUnattendXml'
import {
  APP_CATALOG,
  type KeepAppId,
  type InstallAppId,
  type UnattendConfig,
} from '@/lib/types'
import { INSTALL_APP_CATALOG } from '@/lib/installApps'
import {
  INSTALL_APP_CATEGORIES,
  installAppCategory,
  type InstallAppCategoryId,
} from '@/lib/installAppCategories'
import {
  SYSTEM_APP_CATEGORIES,
  systemAppCategory,
  type SystemAppCategoryId,
} from '@/lib/systemAppCategories'
import { FieldSelect } from './FieldSelect'
import { DeferredTextInput } from './DeferredField'
import { TruncTipText } from './TruncTipText'
import { SideNav } from './SideNav'
import {
  DEFAULT_VOLUMES,
  MAX_VOLUMES,
  MIN_VOLUMES,
  nextVolumeLetter,
} from '@/lib/diskVolumes'
import './Generator.css'

export function Generator() {
  const { lang, t } = useApp()
  const [cfg, setCfg] = useState<UnattendConfig>(defaultConfig)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importUnsupported, setImportUnsupported] = useState<string[]>([])
  const [systemCat, setSystemCat] = useState<SystemAppCategoryId>('all')
  const [installCat, setInstallCat] = useState<InstallAppCategoryId>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const flashTimer = useRef<number | null>(null)
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

  const keyboardOptions = [
    { value: 'ru', label: t('Русская', 'Russian') },
    { value: 'en', label: t('English', 'English') },
  ]

  const secondaryKeyboardOptions = [
    { value: '', label: t('Нет', 'None') },
    ...keyboardOptions,
  ]

  function patch<K extends keyof UnattendConfig>(key: K, value: UnattendConfig[K]) {
    setCfg((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  function setKeyboardPrimary(value: string) {
    const primary = value === 'en' ? 'en' : 'ru'
    setCfg((prev) => {
      const second = prev.keyboards[1]
      const next: Array<'ru' | 'en'> = [primary]
      if (second && second !== primary) next.push(second)
      return { ...prev, keyboards: next }
    })
    setError(null)
  }

  function setKeyboardSecondary(value: string) {
    setCfg((prev) => {
      const primary = prev.keyboards[0] ?? 'ru'
      if (!value || value === primary) {
        return { ...prev, keyboards: [primary] }
      }
      return {
        ...prev,
        keyboards: [primary, value === 'en' ? 'en' : 'ru'],
      }
    })
    setError(null)
  }

  const systemAppsInCat = useMemo(
    () =>
      systemCat === 'all'
        ? APP_CATALOG
        : APP_CATALOG.filter((a) => systemAppCategory(a.id) === systemCat),
    [systemCat],
  )
  const installAppsInCat = useMemo(
    () =>
      installCat === 'all'
        ? INSTALL_APP_CATALOG
        : INSTALL_APP_CATALOG.filter(
            (a) => installAppCategory(a.id) === installCat,
          ),
    [installCat],
  )

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

  function toggleInstall(id: InstallAppId) {
    setCfg((prev) => {
      const has = prev.installApps.includes(id)
      return {
        ...prev,
        installApps: has
          ? prev.installApps.filter((x) => x !== id)
          : [...prev.installApps, id],
      }
    })
  }

  function keepAllInSystemCat() {
    const ids = systemAppsInCat.map((a) => a.id)
    setCfg((prev) => ({
      ...prev,
      keepApps: [...new Set([...prev.keepApps, ...ids])],
    }))
  }

  function clearSystemCat() {
    const ids = new Set(systemAppsInCat.map((a) => a.id))
    setCfg((prev) => ({
      ...prev,
      keepApps: prev.keepApps.filter((id) => {
        if (!ids.has(id)) return true
        return !!APP_CATALOG.find((a) => a.id === id)?.locked
      }),
    }))
  }

  function installAllInCat() {
    const ids = installAppsInCat.map((a) => a.id)
    setCfg((prev) => ({
      ...prev,
      installApps: [...new Set([...prev.installApps, ...ids])],
    }))
  }

  function clearInstallCat() {
    const ids = new Set(installAppsInCat.map((a) => a.id))
    setCfg((prev) => ({
      ...prev,
      installApps: prev.installApps.filter((id) => !ids.has(id)),
    }))
  }

  function goToError(targetId: string) {
    const el = document.getElementById(targetId)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    if (flashTimer.current != null) window.clearTimeout(flashTimer.current)
    setFlashId(targetId)
    flashTimer.current = window.setTimeout(() => {
      setFlashId(null)
      flashTimer.current = null
    }, 2200)

    const focusable =
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLButtonElement
        ? el
        : el.querySelector<HTMLElement>(
            'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), .select__trigger, button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          )
    window.setTimeout(() => focusable?.focus({ preventScroll: true }), 350)
  }

  function flashClass(id: string) {
    return flashId === id ? ' field--flash' : ''
  }

  function resetAll() {
    setCfg({
      ...defaultConfig,
      keyboards: [...defaultConfig.keyboards],
      keepApps: [...defaultConfig.keepApps],
      installApps: [...defaultConfig.installApps],
      volumes: DEFAULT_VOLUMES.map((v) => ({ ...v })),
    })
    setError(null)
    setImportError(null)
    setImportUnsupported([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function updateVolume(
    index: number,
    patchVol: Partial<(typeof cfg.volumes)[number]>,
  ) {
    setCfg((prev) => {
      const volumes = prev.volumes.map((v, i) =>
        i === index ? { ...v, ...patchVol } : v,
      )
      if (volumes[0]) volumes[0] = { ...volumes[0], letter: 'C' }
      const last = volumes.length - 1
      if (last >= 0) volumes[last] = { ...volumes[last], sizeGb: null }
      const letters = new Set(volumes.map((v) => v.letter.toUpperCase()))
      const installDrive = letters.has(prev.installDrive.toUpperCase())
        ? prev.installDrive
        : 'C'
      return { ...prev, volumes, installDrive }
    })
    setError(null)
  }

  function addVolume() {
    setCfg((prev) => {
      if (prev.volumes.length >= MAX_VOLUMES) return prev
      const letter = nextVolumeLetter(prev.volumes)
      const volumes = [...prev.volumes]
      const last = volumes.pop()!
      volumes.push({ letter, label: letter, sizeGb: 50 }, { ...last, sizeGb: null })
      return { ...prev, volumes }
    })
    setError(null)
  }

  function removeVolume(index: number) {
    setCfg((prev) => {
      if (prev.volumes.length <= MIN_VOLUMES || index === 0) return prev
      const volumes = prev.volumes.filter((_, i) => i !== index)
      volumes[0] = { ...volumes[0], letter: 'C' }
      const last = volumes.length - 1
      volumes[last] = { ...volumes[last], sizeGb: null }
      const letters = new Set(volumes.map((v) => v.letter.toUpperCase()))
      const installDrive = letters.has(prev.installDrive.toUpperCase())
        ? prev.installDrive
        : 'C'
      return { ...prev, volumes, installDrive }
    })
    setError(null)
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
        installApps: [...result.config.installApps],
        volumes: result.config.volumes.map((v) => ({ ...v })),
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
        <SideNav />
      </aside>

      <div className="generator__main">
        <header className="generator__intro">
          <h1 className="generator__title">
            {t('Генератор autounattend.xml', 'autounattend.xml generator')}
          </h1>
          <p className="generator__lead">
            {t(
              'Настройте блоки слева по якорям, скачайте файл и положите в корень установочной флешки Windows 11.',
              'Use the sections on the left, download the file, and put it in the root of your Windows 11 install USB.',
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
          <div className={`field${flashClass('field-keyboards')}`} id="field-keyboards">
            <span className="field__label">
              {t('Раскладка 1', 'Layout 1')}
            </span>
            <FieldSelect
              aria-label={t('Раскладка 1', 'Layout 1')}
              value={cfg.keyboards[0] ?? 'ru'}
              options={keyboardOptions}
              onChange={setKeyboardPrimary}
            />
          </div>
          <div className="field">
            <span className="field__label">
              {t('Раскладка 2', 'Layout 2')}
            </span>
            <FieldSelect
              aria-label={t('Раскладка 2', 'Layout 2')}
              value={cfg.keyboards[1] ?? ''}
              options={secondaryKeyboardOptions}
              onChange={setKeyboardSecondary}
            />
          </div>
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
          <fieldset className={`field${flashClass('field-product-key')}`}>
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
              <DeferredTextInput
                id="field-product-key"
                className="field__control"
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                value={cfg.productKeyCustom}
                onCommit={(v) => patch('productKeyCustom', v)}
                autoComplete="off"
              />
            )}
          </fieldset>
        </section>

        <section id="disk" className="block">
          <h2 className="block__title">{t('Диск', 'Disk')}</h2>
          <fieldset className="field">
            <legend className="field__label">{t('Режим', 'Mode')}</legend>
            <div className="choices">
              <label className="choice">
                <input
                  type="radio"
                  name="diskMode"
                  checked={cfg.diskMode === 'interactive'}
                  onChange={() =>
                    setCfg((prev) => ({
                      ...prev,
                      diskMode: 'interactive',
                      installDrive: 'C',
                    }))
                  }
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
              <div id="field-volumes" className={`field${flashClass('field-volumes')}`}>
                <div className="field__label">
                  {t('Разделы (2–5)', 'Volumes (2–5)')}
                </div>
                <div className="volume-list">
                  {cfg.volumes.map((vol, index) => {
                    const isLast = index === cfg.volumes.length - 1
                    const isFirst = index === 0
                    return (
                      <div key={`${vol.letter}-${index}`} className="volume-row">
                        <label className="volume-row__letter">
                          <span className="field__label">
                            {t('Буква', 'Letter')}
                          </span>
                          {isFirst ? (
                            <input
                              className="field__control"
                              value="C"
                              disabled
                              readOnly
                            />
                          ) : (
                            <DeferredTextInput
                              className="field__control"
                              value={vol.letter}
                              maxLength={1}
                              onCommit={(v) =>
                                updateVolume(index, {
                                  letter:
                                    v.toUpperCase().slice(0, 1) || vol.letter,
                                })
                              }
                            />
                          )}
                        </label>
                        <label className="volume-row__label">
                          <span className="field__label">
                            {t('Метка', 'Label')}
                          </span>
                          <DeferredTextInput
                            className="field__control"
                            value={vol.label}
                            onCommit={(v) => updateVolume(index, { label: v })}
                          />
                        </label>
                        <label className="volume-row__size">
                          <span className="field__label">
                            {isLast
                              ? t('Размер', 'Size')
                              : t('Размер (ГБ)', 'Size (GB)')}
                          </span>
                          {isLast ? (
                            <input
                              className="field__control"
                              value={t('остаток', 'remainder')}
                              disabled
                              readOnly
                            />
                          ) : (
                            <DeferredTextInput
                              className="field__control"
                              inputMode="numeric"
                              value={
                                vol.sizeGb == null ? '' : String(vol.sizeGb)
                              }
                              onCommit={(v) => {
                                const trimmed = v.trim()
                                if (!trimmed) {
                                  updateVolume(index, { sizeGb: null })
                                  return
                                }
                                const n = Number(trimmed)
                                updateVolume(index, {
                                  sizeGb: Number.isFinite(n) ? n : null,
                                })
                              }}
                            />
                          )}
                        </label>
                        <div className="volume-row__actions">
                          {!isFirst && cfg.volumes.length > MIN_VOLUMES ? (
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() => removeVolume(index)}
                            >
                              {t('Убрать', 'Remove')}
                            </button>
                          ) : (
                            <span className="volume-row__spacer" aria-hidden />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {cfg.volumes.length < MAX_VOLUMES && (
                  <button
                    type="button"
                    className="btn btn--ghost volume-list__add"
                    onClick={addVolume}
                  >
                    {t('Добавить раздел', 'Add volume')}
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <section id="account" className="block">
          <h2 className="block__title">
            {t('Компьютер и пользователь', 'Computer & user')}
          </h2>
          <label className={`field${flashClass('field-computer-name')}`}>
            <span className="field__label">{t('Имя компьютера', 'Computer name')}</span>
            <DeferredTextInput
              id="field-computer-name"
              className="field__control"
              value={cfg.computerName}
              onCommit={(v) => patch('computerName', v)}
              maxLength={15}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              suppressHydrationWarning
            />
          </label>
          <label className={`field${flashClass('field-user-name')}`}>
            <span className="field__label">
              {t('Локальный пользователь', 'Local user')}
            </span>
            <DeferredTextInput
              id="field-user-name"
              className="field__control"
              value={cfg.userName}
              onCommit={(v) => patch('userName', v)}
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
            <DeferredTextInput
              className="field__control"
              type="password"
              value={cfg.password}
              onCommit={(v) => patch('password', v)}
              autoComplete="off"
              name="wintool-local-password"
              data-1p-ignore
              data-lpignore="true"
              suppressHydrationWarning
            />
          </label>
        </section>

        <section id="system-apps" className="block">
          <h2 className="block__title">
            {t('Системные приложения', 'System apps')}
          </h2>
          <div className="apps-toolbar">
            <button type="button" className="btn btn--ghost" onClick={keepAllInSystemCat}>
              {t('Добавить все', 'Select all')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={clearSystemCat}>
              {t('Убрать все', 'Deselect all')}
            </button>
          </div>
          <div className="apps-cats" role="tablist" aria-label={t('Категории', 'Categories')}>
            {SYSTEM_APP_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={systemCat === cat.id}
                className={
                  systemCat === cat.id
                    ? 'apps-cats__btn apps-cats__btn--active'
                    : 'apps-cats__btn'
                }
                onClick={() => setSystemCat(cat.id)}
              >
                {lang === 'ru' ? cat.ru : cat.en}
              </button>
            ))}
          </div>
          <div className="choices choices--apps">
            {systemAppsInCat.map((app) => {
              const label = lang === 'ru' ? app.labelRu : app.labelEn
              return (
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
                <TruncTipText className="choice__text" text={label} />
              </label>
              )
            })}
          </div>
        </section>

        <section id="apps" className="block">
          <h2 className="block__title">{t('Приложения', 'Apps')}</h2>
          {cfg.diskMode === 'wipe0' && (
            <div
              className={`field${flashClass('field-install-drive')}`}
              id="field-install-drive"
            >
              <span className="field__label">
                {t('Куда ставить программы', 'Install apps to')}
              </span>
              <FieldSelect
                aria-label={t('Куда ставить программы', 'Install apps to')}
                value={cfg.installDrive}
                options={cfg.volumes
                  .map((v) => v.letter.toUpperCase())
                  .filter((L, i, arr) => /^[A-Z]$/.test(L) && arr.indexOf(L) === i)
                  .map((L) => ({
                    value: L,
                    label:
                      L === 'C'
                        ? t('C: (путь по умолчанию)', 'C: (default path)')
                        : t(`${L}:\\Apps`, `${L}:\\Apps`),
                  }))}
                onChange={(v) => patch('installDrive', v)}
              />
            </div>
          )}
          <div className="apps-toolbar">
            <button type="button" className="btn btn--ghost" onClick={installAllInCat}>
              {t('Добавить все', 'Select all')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={clearInstallCat}>
              {t('Убрать все', 'Deselect all')}
            </button>
          </div>
          <div className="apps-cats" role="tablist" aria-label={t('Категории', 'Categories')}>
            {INSTALL_APP_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={installCat === cat.id}
                className={
                  installCat === cat.id
                    ? 'apps-cats__btn apps-cats__btn--active'
                    : 'apps-cats__btn'
                }
                onClick={() => setInstallCat(cat.id)}
              >
                {lang === 'ru' ? cat.ru : cat.en}
              </button>
            ))}
          </div>
          <div className="choices choices--apps">
            {installAppsInCat.map((app) => {
              const label = lang === 'ru' ? app.labelRu : app.labelEn
              return (
              <label key={app.id} className="choice">
                <input
                  type="checkbox"
                  checked={cfg.installApps.includes(app.id)}
                  onChange={() => toggleInstall(app.id)}
                />
                <span className="choice__mark" aria-hidden />
                <TruncTipText className="choice__text" text={label} />
              </label>
              )
            })}
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
          <div className="summary">
            <section className="summary__group">
              <h3 className="summary__group-title">
                {t('Язык и регион', 'Language & region')}
              </h3>
              <dl className="summary__list">
                <div className="summary__row">
                  <dt>{t('Язык Windows', 'Windows language')}</dt>
                  <dd>{cfg.language}</dd>
                </div>
                <div className="summary__row">
                  <dt>{t('Раскладки', 'Keyboards')}</dt>
                  <dd>
                    {cfg.keyboards
                      .map((k) =>
                        k === 'ru'
                          ? t('Русская', 'Russian')
                          : t('English', 'English'),
                      )
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
              </dl>
            </section>

            <section className="summary__group">
              <h3 className="summary__group-title">
                {t('Редакция и ключ', 'Edition & key')}
              </h3>
              <dl className="summary__list">
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
              </dl>
            </section>

            <section className="summary__group">
              <h3 className="summary__group-title">{t('Диск', 'Disk')}</h3>
              <dl className="summary__list">
                <div className="summary__row">
                  <dt>{t('Режим', 'Mode')}</dt>
                  <dd>
                    {cfg.diskMode === 'wipe0'
                      ? t(
                          'Стереть Disk 0 и разметить',
                          'Wipe Disk 0 and partition',
                        )
                      : t('Раздел вручную в Setup', 'Pick partition in Setup')}
                  </dd>
                </div>
                {cfg.diskMode === 'wipe0' && (
                  <>
                    <div className="summary__row summary__row--stack">
                      <dt>{t('Разделы', 'Volumes')}</dt>
                      <dd>
                        <ul className="summary__apps">
                          {cfg.volumes.map((v, i) => (
                            <li key={`${v.letter}-${i}`}>
                              {i === cfg.volumes.length - 1
                                ? t(
                                    `${v.letter}: остаток «${v.label}»`,
                                    `${v.letter}: remainder “${v.label}”`,
                                  )
                                : t(
                                    `${v.letter}: ${v.sizeGb ?? '—'} ГБ «${v.label}»`,
                                    `${v.letter}: ${v.sizeGb ?? '—'} GB “${v.label}”`,
                                  )}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                    <div className="summary__row">
                      <dt>{t('Программы', 'Apps path')}</dt>
                      <dd>
                        {cfg.installDrive === 'C'
                          ? t('C: (по умолчанию)', 'C: (default)')
                          : `${cfg.installDrive}:\\Apps`}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </section>

            <section className="summary__group">
              <h3 className="summary__group-title">
                {t('Компьютер и пользователь', 'Computer & user')}
              </h3>
              <dl className="summary__list">
                <div className="summary__row">
                  <dt>{t('Имя ПК', 'PC name')}</dt>
                  <dd>{cfg.computerName || '—'}</dd>
                </div>
                <div className="summary__row">
                  <dt>{t('Пользователь', 'User')}</dt>
                  <dd>{cfg.userName || '—'}</dd>
                </div>
                <div className="summary__row">
                  <dt>{t('Пароль', 'Password')}</dt>
                  <dd>
                    {cfg.password
                      ? t('Задан', 'Set')
                      : t('Без пароля', 'No password')}
                  </dd>
                </div>
                <div className="summary__row">
                  <dt>{t('Автологин', 'Auto logon')}</dt>
                  <dd>{t('Один раз после установки', 'Once after setup')}</dd>
                </div>
              </dl>
            </section>

            <section className="summary__group">
              <h3 className="summary__group-title">
                {t('Системные приложения', 'System apps')}
              </h3>
              {cfg.keepApps.length === 0 ? (
                <p className="summary__empty">
                  {t(
                    'Ничего не отмечено: снять всё из списка',
                    'Nothing checked: remove everything in the list',
                  )}
                </p>
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
            </section>

            <section className="summary__group">
              <h3 className="summary__group-title">
                {t('Приложения', 'Apps')}
              </h3>
              {cfg.installApps.length === 0 ? (
                <p className="summary__empty">
                  {t('Не выбрано', 'None selected')}
                </p>
              ) : (
                <ul className="summary__apps">
                  {INSTALL_APP_CATALOG.filter((a) =>
                    cfg.installApps.includes(a.id),
                  ).map((a) => (
                    <li key={a.id}>
                      {lang === 'ru' ? a.labelRu : a.labelEn}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="summary__group">
              <h3 className="summary__group-title">{t('Твики', 'Tweaks')}</h3>
              <ul className="summary__apps">
                {(
                  [
                    cfg.disableWidgets
                      ? t('Виджеты выкл.', 'Widgets off')
                      : null,
                    cfg.disableConsumerFeatures
                      ? t('Меньше предложений', 'Fewer suggestions')
                      : null,
                    cfg.disableTelemetry
                      ? t('Телеметрия↓', 'Telemetry↓')
                      : null,
                    cfg.showFileExtensions
                      ? t('Расширения файлов', 'File extensions')
                      : null,
                    cfg.showHiddenFiles
                      ? t('Скрытые файлы', 'Hidden files')
                      : null,
                    cfg.taskbarSearchHidden
                      ? t('Поиск скрыт', 'Search hidden')
                      : null,
                    cfg.taskbarAlignLeft
                      ? t('Панель слева', 'Taskbar left')
                      : null,
                    cfg.taskbarHideTaskView
                      ? t('Без Task View', 'No Task View')
                      : null,
                    cfg.taskbarHideChat ? t('Без чата', 'No chat') : null,
                    cfg.taskbarHideWidgets
                      ? t('Виджеты на панели скрыты', 'Taskbar widgets hidden')
                      : null,
                    cfg.taskbarShowSeconds
                      ? t('Секунды на часах', 'Clock seconds')
                      : null,
                    cfg.taskbarEndTask ? t('End task', 'End task') : null,
                    cfg.disableGameDvr
                      ? t('Game DVR выкл.', 'Game DVR off')
                      : null,
                    cfg.enableLongPaths
                      ? t('Длинные пути', 'Long paths')
                      : null,
                    cfg.numLockOn ? 'NumLock' : null,
                    cfg.disableOneDrive
                      ? t('Без OneDrive', 'No OneDrive')
                      : null,
                    cfg.disableHibernation
                      ? t('Без гибернации', 'No hibernation')
                      : null,
                    cfg.expressPrivacy === 'disable-all'
                      ? t('Минимум данных', 'Minimize data')
                      : t('Приватность по умолчанию', 'Default privacy'),
                  ] as Array<string | null>
                )
                  .filter((x): x is string => Boolean(x))
                  .map((label) => (
                    <li key={label}>{label}</li>
                  ))}
              </ul>
            </section>
          </div>
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
