import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'shell',
  args: ['--no-sandbox', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

for (const [path, out] of [
  ['/', process.argv[2]],
  ['/galerie', process.argv[3]],
]) {
  await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 2000))

  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth
    const guilty = [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > docWidth + 1)
      .slice(0, 5)
      .map((el) => `${el.tagName}.${el.className?.toString().slice(0, 60)}`)
    return {
      docWidth,
      scrollWidth: document.documentElement.scrollWidth,
      hasHorizontalScroll: document.documentElement.scrollWidth > docWidth + 1,
      guilty,
    }
  })
  console.log(path, JSON.stringify(overflow, null, 1))
  await page.screenshot({ path: out })
}

await browser.close()
