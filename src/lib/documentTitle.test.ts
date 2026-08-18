import test from 'node:test'
import assert from 'node:assert/strict'
import { titleForPath } from './documentTitle.ts'

test('home title is brand only', () => {
  assert.equal(titleForPath('/', 'ru'), 'WinTools')
  assert.equal(titleForPath('/', 'en'), 'WinTools')
})

test('tab titles use WinTools - page and follow language', () => {
  assert.equal(titleForPath('/guide', 'ru'), 'WinTools - Инструкция')
  assert.equal(titleForPath('/guide', 'en'), 'WinTools - Guide')
  assert.equal(titleForPath('/about', 'ru'), 'WinTools - О проекте')
  assert.equal(titleForPath('/about', 'en'), 'WinTools - About')
})

test('offline title follows language', () => {
  assert.equal(titleForPath('/~offline', 'ru'), 'WinTools - Нет сети')
  assert.equal(titleForPath('/~offline', 'en'), 'WinTools - Offline')
})
