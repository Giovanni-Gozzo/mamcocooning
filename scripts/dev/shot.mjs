import puppeteer from 'puppeteer-core'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const [, , url, out, widthArg, heightArg, mode] = process.argv

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: ['--no-sandbox', '--hide-scrollbars'],
})

const page = await browser.newPage()
await page.setViewport({
  width: Number(widthArg ?? 1440),
  height: Number(heightArg ?? 1000),
  deviceScaleFactor: 1,
})

const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})

await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 2500))

const diag = await page.evaluate(() => {
  const h1 = document.querySelector('h1')
  const grid = document.querySelector('main section .grid')
  const wrapper = h1?.closest('[style]')
  return {
    scrollY: window.scrollY,
    docHeight: document.documentElement.scrollHeight,
    h1Text: h1?.textContent ?? null,
    h1Opacity: h1 ? getComputedStyle(h1).opacity : null,
    wrapperStyle: wrapper?.getAttribute('style') ?? null,
    wrapperOpacity: wrapper ? getComputedStyle(wrapper).opacity : null,
    imgCount: document.querySelectorAll('img').length,
    imgLoaded: [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth > 0).length,
  }
})

console.log(JSON.stringify({ diag, errors }, null, 2))

if (mode === 'full') {
  await page.screenshot({ path: out, fullPage: true })
} else {
  await page.screenshot({ path: out })
}

await browser.close()
