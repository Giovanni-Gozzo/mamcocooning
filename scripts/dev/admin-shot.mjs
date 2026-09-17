import puppeteer from 'puppeteer-core'

const [, , outLogin, outDash] = process.argv

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'shell',
  args: ['--no-sandbox', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 1200 })

const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1500))
await page.screenshot({ path: outLogin })

await page.type('#password', 'cocooning2026')
await page.click('button[type="submit"]')
await new Promise((r) => setTimeout(r, 3500))

const title = await page.evaluate(() => document.querySelector('h1')?.textContent ?? null)
await page.screenshot({ path: outDash })

console.log(JSON.stringify({ dashboardTitle: title, errors }, null, 2))
await browser.close()
