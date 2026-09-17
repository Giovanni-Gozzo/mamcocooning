import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'shell',
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 1100 })

const failures = []
page.on('response', (res) => {
  if (res.status() >= 400) failures.push(`${res.status()} ${res.url()}`)
})

for (const path of process.argv.slice(2)) {
  failures.length = 0
  await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await new Promise((r) => setTimeout(r, 2000))
  console.log(`${path}: ${failures.length === 0 ? 'OK' : failures.join('\n  ')}`)
}

await browser.close()
