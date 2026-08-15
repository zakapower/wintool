import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultConfig } from './defaults.ts'
import { buildUnattendXml } from './buildUnattendXml.ts'
import { parseUnattendXml } from './parseUnattendXml.ts'

const sampleConfig = {
  ...defaultConfig,
  computerName: 'DESKTOP-PC',
  userName: 'User',
  password: 'Secret1',
  autoLogon: true,
  diskMode: 'wipe0' as const,
  windowsGb: 120,
  labelC: 'Win',
  labelD: 'Files',
  disableTelemetry: true,
  keepApps: ['edge', 'todos'] as const,
}

test('parseUnattendXml round-trips WinTools XML', () => {
  const xml = buildUnattendXml({
    ...sampleConfig,
    keepApps: [...sampleConfig.keepApps],
  })
  const result = parseUnattendXml(xml, 'ru')
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.config.computerName, 'DESKTOP-PC')
  assert.equal(result.config.userName, 'User')
  assert.equal(result.config.password, 'Secret1')
  assert.equal(result.config.autoLogon, true)
  assert.equal(result.config.diskMode, 'wipe0')
  assert.equal(result.config.windowsGb, 120)
  assert.equal(result.config.labelC, 'Win')
  assert.equal(result.config.labelD, 'Files')
  assert.equal(result.config.disableTelemetry, true)
  assert.ok(result.config.keepApps.includes('edge'))
  assert.ok(result.config.keepApps.includes('todos'))
})

test('parseUnattendXml accepts interactive disk', () => {
  const xml = buildUnattendXml({
    ...defaultConfig,
    computerName: 'PC-ONE',
    userName: 'Admin',
    diskMode: 'interactive',
  })
  const result = parseUnattendXml(xml)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.config.diskMode, 'interactive')
})

test('parseUnattendXml rejects unsupported components', () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend">
  <settings pass="specialize">
    <component name="Microsoft-Windows-UnattendedJoin" processorArchitecture="amd64">
      <Identification>
        <JoinDomain>corp.local</JoinDomain>
      </Identification>
    </component>
  </settings>
</unattend>`
  const result = parseUnattendXml(xml, 'ru')
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /нельзя задать|Import cancelled|отменена/i)
  assert.ok(result.unsupported.length > 0)
})

test('parseUnattendXml rejects unknown FirstLogon description', () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend">
  <settings pass="oobeSystem">
    <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="amd64">
      <FirstLogonCommands>
        <SynchronousCommand>
          <Order>1</Order>
          <Description>Install malware</Description>
          <CommandLine>cmd.exe /c echo hi</CommandLine>
        </SynchronousCommand>
      </FirstLogonCommands>
    </component>
  </settings>
</unattend>`
  const result = parseUnattendXml(xml, 'en')
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.ok(result.unsupported.some((u) => /FirstLogon/i.test(u)))
})
