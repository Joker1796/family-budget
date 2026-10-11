// Локальный стенд бэкенда: исполняет настоящий apps-script/Code.gs на эмуляции
// Google Таблицы в памяти (данные пропадают при перезапуске).
// В настройках приложения: адрес http://localhost:18787/, пароль — test.
import http from 'node:http'
import fs from 'node:fs'
import vm from 'node:vm'
import crypto from 'node:crypto'

function createSheet(name) {
  const cells = [] // cells[row][col], 0-based
  const lastRow = () => cells.length
  const lastCol = () => Math.max(0, ...cells.map((r) => r.length))
  const range = (row, col, numRows = 1, numCols = 1) => {
    const r = {
      getValues: () =>
        Array.from({ length: numRows }, (_, i) =>
          Array.from({ length: numCols }, (_, j) => cells[row - 1 + i]?.[col - 1 + j] ?? ''),
        ),
      setValues: (values) => {
        values.forEach((vals, i) => {
          cells[row - 1 + i] ??= []
          vals.forEach((v, j) => (cells[row - 1 + i][col - 1 + j] = v))
        })
        return r
      },
      setValue: (v) => r.setValues([[v]]),
      setFontWeight: () => r,
      setNumberFormat: () => r,
    }
    return r
  }
  return {
    name,
    setFrozenRows() {},
    getLastRow: lastRow,
    getLastColumn: lastCol,
    getMaxRows: () => 1000,
    getRange: range,
    getDataRange: () => range(1, 1, Math.max(1, lastRow()), Math.max(1, lastCol())),
  }
}

const sheets = {}
const props = { FAMILY_SECRET: 'test' }
const context = vm.createContext({
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({
      getSheetByName: (n) => sheets[n] ?? null,
      insertSheet: (n) => (sheets[n] = createSheet(n)),
    }),
  },
  PropertiesService: {
    getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => (props[k] = v) }),
  },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  ContentService: {
    MimeType: { JSON: 'json' },
    createTextOutput: (content) => ({ content, setMimeType() { return this } }),
  },
  Utilities: { getUuid: () => crypto.randomUUID(), formatDate: (d) => d.toISOString().slice(0, 10) },
  Session: { getScriptTimeZone: () => 'Europe/Moscow' },
  Logger: { log: (...a) => console.log('[gs]', ...a) },
})

const codePath = new URL('../apps-script/Code.gs', import.meta.url)
vm.runInContext(fs.readFileSync(codePath, 'utf8'), context)
vm.runInContext('setup()', context)

http
  .createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (req.method !== 'POST') {
      res.writeHead(405) // Apps Script тоже не отвечает на CORS preflight
      return res.end()
    }
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json')
      res.end(context.doPost({ postData: { contents: body } }).content)
    })
  })
  .listen(18787, () => console.log('mock (Code.gs) on http://localhost:18787/'))
