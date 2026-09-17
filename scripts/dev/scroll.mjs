import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'shell',
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1500))

const before = await page.evaluate(() => {
  const bar = document.querySelector('[aria-hidden][style*="scaleX"], .fixed.inset-x-0.top-0.h-\\[3px\\]')
  return {
    scrollY: window.scrollY,
    barTransform: bar ? getComputedStyle(bar).transform : null,
  }
})

await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }))
await new Promise((r) => setTimeout(r, 1200))

const after = await page.evaluate(() => {
  const bar = document.querySelector('.fixed.inset-x-0.top-0')
  const heroWrapper = document.querySelector('main section [style*="opacity"]')
  return {
    scrollY: window.scrollY,
    barTransform: bar ? getComputedStyle(bar).transform : null,
    heroStyle: heroWrapper?.getAttribute('style') ?? null,
    rootScrollWidth: document.documentElement.scrollWidth,
  }
})

console.log(JSON.stringify({ before, after }, null, 1))
await browser.close()
