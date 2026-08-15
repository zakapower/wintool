import type { UnattendConfig } from './types.ts'
import { BLOAT_PACKAGES } from './bloatPackages.ts'
import { INSTALL_APP_CATALOG } from './installApps.ts'
import {
  MIN_DATA_GB,
  MIN_VOLUMES,
  MAX_VOLUMES,
  MIN_WINDOWS_GB,
  normalizeVolumes,
} from './diskVolumes.ts'

const EDITION_NAME: Record<UnattendConfig['edition'], string> = {
  Pro: 'Windows 11 Pro',
  Home: 'Windows 11 Home',
  Enterprise: 'Windows 11 Enterprise',
}

const GENERIC_KEYS: Record<UnattendConfig['edition'], string> = {
  // Generic keys install edition but do not activate
  Pro: 'VK7JG-NPHTM-C97JM-9MPGT-3V66T',
  Home: 'YTMG3-N6DKC-DKB77-7M9GH-8HVX7',
  Enterprise: 'XGVPP-NMH47-7TTHJ-W3FW7-8HV2C',
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function uiLanguage(cfg: UnattendConfig): string {
  return cfg.language
}

function inputLocale(cfg: UnattendConfig): string {
  const locales = cfg.keyboards.map((k) =>
    k === 'ru' ? '0419:00000419' : '0409:00000409',
  )
  return locales.join(';') || '0419:00000419'
}

function productKeyXml(cfg: UnattendConfig): string {
  if (cfg.productKeyMode === 'none') return ''
  const key =
    cfg.productKeyMode === 'custom'
      ? cfg.productKeyCustom.trim()
      : GENERIC_KEYS[cfg.edition]
  if (!key) return ''
  return `<ProductKey>${esc(key)}</ProductKey>`
}

function imageInstallXml(cfg: UnattendConfig): string {
  const from = `
            <InstallFrom>
              <MetaData wcm:action="add">
                <Key>/IMAGE/NAME</Key>
                <Value>${esc(EDITION_NAME[cfg.edition])}</Value>
              </MetaData>
            </InstallFrom>`
  if (cfg.diskMode === 'interactive') {
    return `
      <ImageInstall>
        <OSImage>
          ${from}
          <InstallToAvailablePartition>true</InstallToAvailablePartition>
        </OSImage>
      </ImageInstall>`
  }
  const volumes = normalizeVolumes(cfg.volumes)
  // Partition orders: 1 EFI, 2 MSR, then data volumes starting at 3
  const createParts: string[] = [
    `<CreatePartition wcm:action="add">
              <Order>1</Order>
              <Type>EFI</Type>
              <Size>260</Size>
            </CreatePartition>`,
    `<CreatePartition wcm:action="add">
              <Order>2</Order>
              <Type>MSR</Type>
              <Size>16</Size>
            </CreatePartition>`,
  ]
  const modifyParts: string[] = [
    `<ModifyPartition wcm:action="add">
              <Order>1</Order>
              <PartitionID>1</PartitionID>
              <Format>FAT32</Format>
              <Label>EFI</Label>
            </ModifyPartition>`,
    `<ModifyPartition wcm:action="add">
              <Order>2</Order>
              <PartitionID>2</PartitionID>
            </ModifyPartition>`,
  ]

  volumes.forEach((vol, i) => {
    const order = i + 3
    if (vol.sizeGb == null) {
      createParts.push(`<CreatePartition wcm:action="add">
              <Order>${order}</Order>
              <Type>Primary</Type>
              <Extend>true</Extend>
            </CreatePartition>`)
    } else {
      const mb = Math.max(1, Math.round(vol.sizeGb)) * 1024
      createParts.push(`<CreatePartition wcm:action="add">
              <Order>${order}</Order>
              <Type>Primary</Type>
              <Size>${mb}</Size>
            </CreatePartition>`)
    }
    modifyParts.push(`<ModifyPartition wcm:action="add">
              <Order>${order}</Order>
              <PartitionID>${order}</PartitionID>
              <Format>NTFS</Format>
              <Label>${esc(vol.label)}</Label>
              <Letter>${esc(vol.letter)}</Letter>
            </ModifyPartition>`)
  })

  return `
      <DiskConfiguration>
        <Disk wcm:action="add">
          <DiskID>0</DiskID>
          <WillWipeDisk>true</WillWipeDisk>
          <CreatePartitions>
            ${createParts.join('\n            ')}
          </CreatePartitions>
          <ModifyPartitions>
            ${modifyParts.join('\n            ')}
          </ModifyPartitions>
        </Disk>
      </DiskConfiguration>
      <ImageInstall>
        <OSImage>
          ${from}
          <InstallTo>
            <DiskID>0</DiskID>
            <PartitionID>3</PartitionID>
          </InstallTo>
        </OSImage>
      </ImageInstall>`
}

function bloatScript(cfg: UnattendConfig): string {
  const keep = new Set(cfg.keepApps)
  const remove = BLOAT_PACKAGES.filter((p) => !keep.has(p.removeUnless)).map(
    (p) => p.id,
  )

  const lines = [
    '$ErrorActionPreference = "SilentlyContinue"',
    ...remove.map(
      (id) =>
        `Get-AppxPackage -AllUsers "${id}" | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue; Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -eq "${id}" } | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue`,
    ),
  ]

  if (!keep.has('edge')) {
    lines.push(
      'Get-AppxPackage -AllUsers *Edge* | Where-Object { $_.Name -notmatch "Dev|Beta|Canary" } | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue',
      'Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -like "*Edge*" } | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue',
    )
  }

  if (cfg.disableWidgets) {
    lines.push(
      'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v AllowNewsAndInterests /t REG_DWORD /d 0 /f',
    )
  }
  if (cfg.disableConsumerFeatures) {
    lines.push(
      'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsConsumerFeatures /t REG_DWORD /d 1 /f',
    )
  }
  if (cfg.showFileExtensions) {
    lines.push(
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v HideFileExt /t REG_DWORD /d 0 /f',
    )
  }
  if (cfg.showHiddenFiles) {
    lines.push(
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v Hidden /t REG_DWORD /d 1 /f',
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ShowSuperHidden /t REG_DWORD /d 1 /f',
    )
  }
  if (cfg.taskbarSearchHidden) {
    lines.push(
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v SearchboxTaskbarMode /t REG_DWORD /d 0 /f',
    )
  }
  if (cfg.taskbarAlignLeft) {
    lines.push(
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v TaskbarAl /t REG_DWORD /d 0 /f',
    )
  }
  if (cfg.taskbarHideTaskView) {
    lines.push(
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ShowTaskViewButton /t REG_DWORD /d 0 /f',
    )
  }
  if (cfg.taskbarHideChat) {
    lines.push(
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v TaskbarMn /t REG_DWORD /d 0 /f',
    )
  }
  if (cfg.taskbarHideWidgets) {
    lines.push(
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v TaskbarDa /t REG_DWORD /d 0 /f',
    )
  }
  if (cfg.taskbarShowSeconds) {
    lines.push(
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ShowSecondsInSystemClock /t REG_DWORD /d 1 /f',
    )
  }
  if (cfg.taskbarEndTask) {
    lines.push(
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings" /v TaskbarEndTask /t REG_DWORD /d 1 /f',
    )
  }
  if (cfg.disableGameDvr) {
    lines.push(
      'reg add "HKCU\\System\\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 0 /f',
      'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v AllowGameDVR /t REG_DWORD /d 0 /f',
    )
  }
  if (cfg.enableLongPaths) {
    lines.push(
      'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f',
    )
  }
  if (cfg.numLockOn) {
    lines.push(
      'reg add "HKU\\.DEFAULT\\Control Panel\\Keyboard" /v InitialKeyboardIndicators /t REG_SZ /d 2 /f',
    )
  }
  if (cfg.disableTelemetry) {
    lines.push(
      'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f',
      'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f',
    )
  }
  if (cfg.disableOneDrive) {
    lines.push(
      'Stop-Process -Name OneDrive -Force -ErrorAction SilentlyContinue',
      '@("$env:SystemRoot\\System32\\OneDriveSetup.exe","$env:SystemRoot\\SysWOW64\\OneDriveSetup.exe") | ForEach-Object { if (Test-Path $_) { Start-Process $_ -ArgumentList "/uninstall" -Wait -ErrorAction SilentlyContinue } }',
    )
  }
  if (cfg.disableHibernation) {
    lines.push('powercfg /h off')
  }

  const toInstall = INSTALL_APP_CATALOG.filter((a) =>
    cfg.installApps.includes(a.id),
  )
  if (toInstall.length) {
    const drive = (cfg.installDrive || 'C').toUpperCase().slice(0, 1)
    const locationArg =
      drive && drive !== 'C' ? ` --location "${drive}:\\Apps"` : ''
    lines.push(
      '$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")',
      ...toInstall.map(
        (a) =>
          `winget install -e --id ${a.wingetId} --accept-package-agreements --accept-source-agreements --disable-interactivity${locationArg}`,
      ),
    )
  }

  // Escape for XML via EncodedCommand — UTF-16LE base64 (works in Node and browser)
  const ps = lines.join('; ')
  const b64 = utf16LeToBase64(ps)
  return `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`
}

function utf16LeToBase64(text: string): string {
  const bytes = new Uint8Array(text.length * 2)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    bytes[i * 2] = code & 0xff
    bytes[i * 2 + 1] = (code >> 8) & 0xff
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

export type ConfigError = {
  message: string
  targetId: string
}

export function validateConfig(
  cfg: UnattendConfig,
  lang: 'ru' | 'en' = 'ru',
): ConfigError[] {
  const t = (ru: string, en: string) => (lang === 'ru' ? ru : en)
  const errors: ConfigError[] = []
  if (!cfg || typeof cfg !== 'object') {
    errors.push({
      message: t('Некорректная конфигурация', 'Invalid configuration'),
      targetId: 'download',
    })
    return errors
  }
  const computerName =
    typeof cfg.computerName === 'string' ? cfg.computerName : ''
  const userName = typeof cfg.userName === 'string' ? cfg.userName : ''
  if (!/^[A-Za-z0-9-]{1,15}$/.test(computerName)) {
    errors.push({
      message: t(
        'Имя ПК: 1–15 символов (латиница, цифры, дефис)',
        'PC name: 1–15 chars (letters, digits, hyphen)',
      ),
      targetId: 'field-computer-name',
    })
  }
  if (!userName.trim()) {
    errors.push({
      message: t('Укажите имя пользователя', 'Enter a user name'),
      targetId: 'field-user-name',
    })
  }
  if (cfg.diskMode === 'wipe0') {
    // Do not fill missing sizes — empty fields must surface as errors.
    const volumes = Array.isArray(cfg.volumes)
      ? cfg.volumes.map((v) => ({
          letter: String(v?.letter ?? '')
            .toUpperCase()
            .slice(0, 1),
          label: typeof v?.label === 'string' ? v.label : '',
          sizeGb: v?.sizeGb,
        }))
      : []
    if (volumes.length < MIN_VOLUMES || volumes.length > MAX_VOLUMES) {
      errors.push({
        message: t(
          `Нужно от ${MIN_VOLUMES} до ${MAX_VOLUMES} разделов`,
          `Need ${MIN_VOLUMES}–${MAX_VOLUMES} volumes`,
        ),
        targetId: 'field-volumes',
      })
    }
    if (volumes[0]?.letter !== 'C') {
      errors.push({
        message: t(
          'Первый раздел должен быть C: (Windows)',
          'First volume must be C: (Windows)',
        ),
        targetId: 'field-volumes',
      })
    }
    if (volumes.length && volumes[volumes.length - 1].sizeGb != null) {
      errors.push({
        message: t(
          'Последний раздел должен быть «остаток»',
          'Last volume must be the remainder',
        ),
        targetId: 'field-volumes',
      })
    }
    const letters = new Set<string>()
    for (let i = 0; i < volumes.length; i++) {
      const v = volumes[i]
      const L = v.letter.toUpperCase()
      if (!/^[A-Z]$/.test(L)) {
        errors.push({
          message: t('Некорректная буква диска', 'Invalid drive letter'),
          targetId: 'field-volumes',
        })
        break
      }
      if (letters.has(L)) {
        errors.push({
          message: t(
            'Буквы разделов должны быть разными',
            'Volume letters must be unique',
          ),
          targetId: 'field-volumes',
        })
        break
      }
      letters.add(L)
      if (!v.label.trim()) {
        errors.push({
          message: t(
            `Укажите метку для ${L}:`,
            `Enter a label for ${L}:`,
          ),
          targetId: 'field-volumes',
        })
      }
      if (i < volumes.length - 1) {
        if (v.sizeGb == null || !Number.isFinite(v.sizeGb)) {
          errors.push({
            message: t(
              `Укажите размер для ${L}: (ГБ)`,
              `Enter size for ${L}: (GB)`,
            ),
            targetId: 'field-volumes',
          })
        } else if (i === 0 && (v.sizeGb < MIN_WINDOWS_GB || v.sizeGb > 2000)) {
          errors.push({
            message: t(
              `Размер C: от ${MIN_WINDOWS_GB} до 2000 ГБ`,
              `C: size must be ${MIN_WINDOWS_GB}–2000 GB`,
            ),
            targetId: 'field-volumes',
          })
        } else if (i > 0 && v.sizeGb < MIN_DATA_GB) {
          errors.push({
            message: t(
              `Размер ${L}: минимум ${MIN_DATA_GB} ГБ`,
              `${L}: size at least ${MIN_DATA_GB} GB`,
            ),
            targetId: 'field-volumes',
          })
        }
      }
    }
  }
  if (cfg.installApps.length > 0) {
    const drive = (cfg.installDrive || 'C').toUpperCase()
    if (!/^[A-Z]$/.test(drive)) {
      errors.push({
        message: t(
          'Укажите букву диска для программ',
          'Pick a drive letter for apps',
        ),
        targetId: 'field-install-drive',
      })
    } else if (cfg.diskMode === 'wipe0') {
      const letters = new Set(
        cfg.volumes.map((v) => v.letter.toUpperCase().slice(0, 1)),
      )
      if (!letters.has(drive)) {
        errors.push({
          message: t(
            'Диск для программ должен совпадать с одним из разделов',
            'App install drive must match one of the volumes',
          ),
          targetId: 'field-install-drive',
        })
      }
    }
  }
  if (cfg.productKeyMode === 'custom' && cfg.productKeyCustom.trim().length < 5) {
    errors.push({
      message: t(
        'Укажите ключ продукта или выберите другой режим',
        'Enter a product key or pick another mode',
      ),
      targetId: 'field-product-key',
    })
  }
  if (!cfg.keyboards.length) {
    errors.push({
      message: t('Нужна хотя бы одна раскладка', 'At least one keyboard layout'),
      targetId: 'field-keyboards',
    })
  }
  return errors
}

export function buildUnattendXml(cfg: UnattendConfig): string {
  const lang = uiLanguage(cfg)
  const locale = inputLocale(cfg)
  const pass = esc(cfg.password)
  const user = esc(cfg.userName.trim())
  const protect =
    cfg.expressPrivacy === 'disable-all'
      ? '<ProtectYourPC>3</ProtectYourPC>'
      : '<ProtectYourPC>1</ProtectYourPC>'

  const autoLogon = `
      <AutoLogon>
        <Enabled>true</Enabled>
        <Username>${user}</Username>
        <Password>
          <Value>${pass}</Value>
          <PlainText>true</PlainText>
        </Password>
        <LogonCount>1</LogonCount>
      </AutoLogon>`

  const firstLogon = `
      <FirstLogonCommands>
        <SynchronousCommand wcm:action="add">
          <Order>1</Order>
          <Description>WinTools debloat</Description>
          <CommandLine>${esc(bloatScript(cfg))}</CommandLine>
        </SynchronousCommand>
      </FirstLogonCommands>`

  return `<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
  <settings pass="windowsPE">
    <component name="Microsoft-Windows-International-Core-WinPE" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
      <SetupUILanguage>
        <UILanguage>${lang}</UILanguage>
      </SetupUILanguage>
      <InputLocale>${locale}</InputLocale>
      <SystemLocale>${lang}</SystemLocale>
      <UILanguage>${lang}</UILanguage>
      <UserLocale>${lang}</UserLocale>
    </component>
    <component name="Microsoft-Windows-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
      ${productKeyXml(cfg)}
      ${imageInstallXml(cfg)}
      <UserData>
        <AcceptEula>true</AcceptEula>
        <FullName>${user}</FullName>
        <Organization>WinTools</Organization>
      </UserData>
    </component>
  </settings>
  <settings pass="specialize">
    <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
      <ComputerName>${esc(cfg.computerName)}</ComputerName>
      <TimeZone>${esc(cfg.timezone)}</TimeZone>
    </component>
  </settings>
  <settings pass="oobeSystem">
    <component name="Microsoft-Windows-International-Core" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
      <InputLocale>${locale}</InputLocale>
      <SystemLocale>${lang}</SystemLocale>
      <UILanguage>${lang}</UILanguage>
      <UserLocale>${lang}</UserLocale>
    </component>
    <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
      <OOBE>
        <HideEULAPage>true</HideEULAPage>
        <HideOEMRegistrationScreen>true</HideOEMRegistrationScreen>
        <HideOnlineAccountScreens>true</HideOnlineAccountScreens>
        <HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>
        <SkipMachineOOBE>true</SkipMachineOOBE>
        <SkipUserOOBE>true</SkipUserOOBE>
        ${protect}
      </OOBE>
      <UserAccounts>
        <LocalAccounts>
          <LocalAccount wcm:action="add">
            <Name>${user}</Name>
            <DisplayName>${user}</DisplayName>
            <Group>Administrators</Group>
            <Password>
              <Value>${pass}</Value>
              <PlainText>true</PlainText>
            </Password>
          </LocalAccount>
        </LocalAccounts>
      </UserAccounts>
      ${autoLogon}
      ${firstLogon}
    </component>
  </settings>
</unattend>
`
}
