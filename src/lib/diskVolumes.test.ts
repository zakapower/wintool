import test from 'node:test'
import assert from 'node:assert/strict'
import { appendVolume, DEFAULT_VOLUMES } from './diskVolumes.ts'

test('appendVolume adds a named remainder at the bottom', () => {
  const next = appendVolume(DEFAULT_VOLUMES)
  assert.deepEqual(next, [
    { letter: 'C', label: 'Windows', sizeGb: 150 },
    { letter: 'D', label: 'Data', sizeGb: 50 },
    { letter: 'E', label: 'Games', sizeGb: null },
  ])
})

test('appendVolume keeps adding below existing volumes', () => {
  const next = appendVolume(
    appendVolume(DEFAULT_VOLUMES),
  )
  assert.equal(next[next.length - 1].letter, 'F')
  assert.equal(next[next.length - 1].label, 'Files')
  assert.equal(next[next.length - 1].sizeGb, null)
  assert.equal(next[2].letter, 'E')
  assert.equal(next[2].label, 'Games')
  assert.equal(next[2].sizeGb, 50)
})
