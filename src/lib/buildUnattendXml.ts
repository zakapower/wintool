import type { UnattendConfig } from './types.ts'
import { BLOAT_PACKAGES } from './bloatPackages.ts'

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
  const winMb = Math.max(20, Math.round(cfg.windowsGb)) * 1024
  return `
      <DiskConfiguration>
        <Disk wcm:action="add">
          <DiskID>0</DiskID>
          <WillWipeDisk>true</WillWipeDisk>
          <CreatePartitions>
            <CreatePartition wcm:action="add">
              <Order>1</Order>
              <Type>EFI</Type>
              <Size>260</Size>
            </CreatePartition>
            <CreatePartition wcm:action="add">
              <Order>2</Order>
              <Type>MSR</Type>
              <Size>16</Size>
            </CreatePartition>
            <CreatePartition wcm:action="add">
              <Order>3</Order>
              <Type>Primary</Type>
              <Size>${winMb}</Size>
            </CreatePartition>
            <CreatePartition wcm:action="add">
              <Order>4</Order>
              <Type>Primary</Type>
              <Extend>true</Extend>
            </CreatePartition>
          </CreatePartitions>
          <ModifyPartitions>
            <ModifyPartition wcm:action="add">
              <Order>1</Order>
              <PartitionID>1</PartitionID>
              <Format>FAT32</Format>
              <Label>EFI</Label>
            </ModifyPartition>
            <ModifyPartition wcm:action="add">
              <Order>2</Order>
              <PartitionID>2</PartitionID>
            </ModifyPartition>
            <ModifyPartition wcm:action="add">
              <Order>3</Order>
              <PartitionID>3</PartitionID>
              <Format>NTFS</Format>
              <Label>${esc(cfg.labelC)}</Label>
              <Letter>C</Letter>
            </ModifyPartition>
            <ModifyPartition wcm:action="add">
              <Order>4</Order>
              <PartitionID>4</PartitionID>
              <Format>NTFS</Format>
              <Label>${esc(cfg.labelD)}</Label>
              <Letter>D</Letter>
            </ModifyPartition>
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
      'taskkill /f /im OneDrive.exe',
      'if exist "%SystemRoot%\\System32\\OneDriveSetup.exe" start /wait "" "%SystemRoot%\\System32\\OneDriveSetup.exe" /uninstall',
      'if exist "%SystemRoot%\\SysWOW64\\OneDriveSetup.exe" start /wait "" "%SystemRoot%\\SysWOW64\\OneDriveSetup.exe" /uninstall',
    )
  }
  if (cfg.disableHibernation) {
    lines.push('powercfg /h off')
  }
  // Escape for XML CDATA-ish via RunSynchronousCommand — use base64 for safety
  const ps = lines.join('; ')
  const b64 = Buffer.from(ps, 'utf16le').toString('base64')
  return `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`
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
  if (!/^[A-Za-z0-9-]{1,15}$/.test(cfg.computerName)) {
    errors.push({
      message: t(
        'Имя ПК: 1–15 символов (латиница, цифры, дефис)',
        'PC name: 1–15 chars (letters, digits, hyphen)',
      ),
      targetId: 'field-computer-name',
    })
  }
  if (!cfg.userName.trim()) {
    errors.push({
      message: t('Укажите имя пользователя', 'Enter a user name'),
      targetId: 'field-user-name',
    })
  }
  if (cfg.diskMode === 'wipe0') {
    if (cfg.windowsGb < 40 || cfg.windowsGb > 2000) {
      errors.push({
        message: t('Размер C: от 40 до 2000 ГБ', 'C: size must be 40–2000 GB'),
        targetId: 'field-windows-gb',
      })
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

  const autoLogon = cfg.autoLogon
    ? `
      <AutoLogon>
        <Enabled>true</Enabled>
        <Username>${user}</Username>
        <Password>
          <Value>${pass}</Value>
          <PlainText>true</PlainText>
        </Password>
        <LogonCount>1</LogonCount>
      </AutoLogon>`
    : ''

  const firstLogon = `
      <FirstLogonCommands>
        <SynchronousCommand wcm:action="add">
          <Order>1</Order>
          <Description>Wintool debloat</Description>
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
        <Organization>Wintool</Organization>
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
