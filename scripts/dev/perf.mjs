import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] ?? 'https://mamcocooning.vercel.app'
const b = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'shell', args: ['--no-sandbox'],
})

for (const path of ['/', '/galerie']) {
  const p = await b.newPage()
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  await p.emulateCPUThrottling(4)
  const client = await p.createCDPSession()
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8,
  })

  const errors = []
  const resources = []
  p.on('pageerror', e => errors.push(e.message))
  p.on('response', async r => {
    const len = Number(r.headers()['content-length'] ?? 0)
    if (len > 0) resources.push({ url: r.url(), type: r.request().resourceType(), kb: Math.round(len / 1024) })
  })

  const start = Date.now()
  await p.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 120000 })
  const loadMs = Date.now() - start
  await new Promise(r => setTimeout(r, 6000))

  const metrics = await p.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const lcp = performance.getEntriesByType('largest-contentful-paint').at(-1)
    return {
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      lcpMs: Math.round(lcp?.startTime ?? 0),
      imgCount: document.querySelectorAll('img').length,
      animatedEls: document.querySelectorAll('[class*="animate-"]').length,
      blurEls: [...document.querySelectorAll('*')].filter(e => {
        const f = getComputedStyle(e).filter
        return f && f.includes('blur')
      }).length,
    }
  })

  const totalKb = resources.reduce((s, r) => s + r.kb, 0)
  const byType = {}
  for (const r of resources) byType[r.type] = (byType[r.type] ?? 0) + r.kb
  const heaviest = [...resources].sort((a, x) => x.kb - a.kb).slice(0, 6)

  console.log(`\n=== ${path} ===`)
  console.log('chargement      :', loadMs, 'ms  | LCP', metrics.lcpMs, 'ms')
  console.log('poids total     :', totalKb, 'Ko', JSON.stringify(byType))
  console.log('images / anims  :', metrics.imgCount, 'img |', metrics.animatedEls, 'animés |', metrics.blurEls, 'floutés')
  console.log('plus lourds     :')
  heaviest.forEach(r => console.log('   ', String(r.kb).padStart(5), 'Ko', r.url.slice(0, 95)))
  if (errors.length) console.log('ERREURS JS      :', errors)
  await p.close()
}
await b.close()
