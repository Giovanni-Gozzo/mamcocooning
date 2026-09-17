/**
 * Visual and layout smoke check against a running dev server.
 *   npm run dev
 *   node scripts/dev/check.mjs [--shots <dossier>]
 *
 * Reports, per page: failed requests, console errors, missing h1, and any
 * horizontal overflow at phone width — the three things that break a site like
 * this without showing up in the build output.
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = process.env.CHECK_BASE_URL ?? 'http://localhost:3000'
const PAGES = ['/', '/programmes', '/galerie', '/equipe', '/contact', '/admin']
const PHONE = { width: 390, height: 844, isMobile: true, hasTouch: true }
const DESKTOP = { width: 1440, height: 1000 }
const SETTLE_MS = 1800

const shotsIndex = process.argv.indexOf('--shots')
const shotsDir = shotsIndex === -1 ? null : process.argv[shotsIndex + 1]
if (shotsDir !== null && shotsDir !== undefined) mkdirSync(shotsDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: ['--no-sandbox', '--hide-scrollbars'],
})

let failureCount = 0

async function inspect(path, viewport, label) {
  const page = await browser.newPage()
  await page.setViewport({ deviceScaleFactor: 1, ...viewport })

  const problems = []
  page.on('pageerror', (error) => problems.push(`erreur JS : ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console : ${message.text()}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`)
  })

  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS))

  const layout = await page.evaluate(() => {
    window.scrollTo(600, 0)
    const sideways = window.scrollX > 0
    window.scrollTo(0, 0)
    return {
      sideways,
      headings: document.querySelectorAll('h1').length,
      title: document.title,
    }
  })

  if (layout.sideways) problems.push('défilement horizontal')
  if (layout.headings !== 1) problems.push(`${layout.headings} balise(s) h1 (attendu : 1)`)

  if (shotsDir !== null && shotsDir !== undefined) {
    await page.screenshot({ path: join(shotsDir, `${label}${path.replace(/\//g, '_')}.png`) })
  }

  await page.close()

  failureCount += problems.length
  const status = problems.length === 0 ? 'OK' : problems.join(' · ')
  console.log(`${label.padEnd(8)} ${path.padEnd(13)} ${status}`)
}

for (const path of PAGES) await inspect(path, DESKTOP, 'desktop')
for (const path of PAGES) await inspect(path, PHONE, 'mobile')

await browser.close()

console.log(failureCount === 0 ? '\nAucun problème détecté.' : `\n${failureCount} problème(s).`)
process.exit(failureCount === 0 ? 0 : 1)
