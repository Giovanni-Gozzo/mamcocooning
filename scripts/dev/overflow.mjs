import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'shell',
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })

for (const path of process.argv.slice(2)) {
  await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 1500))
  const result = await page.evaluate(() => {
    window.scrollTo(500, 0)
    const scrolled = window.scrollX
    window.scrollTo(0, 0)
    return {
      root: document.documentElement.scrollWidth,
      canScrollSideways: scrolled > 0,
    }
  })
  console.log(path, JSON.stringify(result))
}
await browser.close()
