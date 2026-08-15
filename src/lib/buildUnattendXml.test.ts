import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultConfig } from './defaults.ts'
import { buildUnattendXml, validateConfig } from './buildUnattendXml.ts'

const sampleConfig = {
  ...defaultConfig,
  computerName: 'DESKTOP-PC',
  userName: 'User',
}

test('default config requires account fields', () => {
  const errors = validateConfig(defaultConfig)
  assert.ok(errors.some((e) => /ПК|PC name/i.test(e.message)))
  assert.ok(errors.some((e) => /пользовател|user name/i.test(e.message)))
  assert.equal(
    errors.find((e) => /ПК|PC name/i.test(e.message))?.targetId,
    'field-computer-name',
  )
  assert.equal(
    errors.find((e) => /пользовател|user name/i.test(e.message))?.targetId,
    'field-user-name',
  )
})

test('sample config validates', () => {
  assert.deepEqual(validateConfig(sampleConfig), [])
})

test('buildUnattendXml includes computer name and wipe disk', () => {
  const xml = buildUnattendXml({ ...sampleConfig, diskMode: 'wipe0' })
  assert.match(xml, /<ComputerName>DESKTOP-PC<\/ComputerName>/)
  assert.match(xml, /<WillWipeDisk>true<\/WillWipeDisk>/)
  assert.match(xml, /<Letter>C<\/Letter>/)
  assert.match(xml, /<Letter>D<\/Letter>/)
  assert.match(xml, /<Name>User<\/Name>/)
  assert.match(xml, /Windows 11 Pro/)
})

test('interactive disk omits DiskConfiguration', () => {
  const xml = buildUnattendXml(sampleConfig)
  assert.doesNotMatch(xml, /WillWipeDisk/)
  assert.match(xml, /InstallToAvailablePartition/)
})
