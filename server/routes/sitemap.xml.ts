/**
 * Sitemap-Route: /sitemap.xml
 *
 * M1: Statische oeffentliche Seiten. Dynamische Funnel-URLs (/f/*) werden
 * perspektivisch in M2 per API-Abfrage ergaenzt.
 *
 * Die Domain wird aus dem eingehenden Request ermittelt, damit Staging-
 * und Produktions-Deployments dieselbe Datei nutzen koennen.
 */
export default defineEventHandler((event) => {
  const origin = getRequestURL(event).origin

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=86400')

  const pages: { loc: string; changefreq: string; priority: string }[] = [
    { loc: '/', changefreq: 'monthly', priority: '0.5' },
    { loc: '/impressum', changefreq: 'yearly', priority: '0.3' },
    { loc: '/datenschutz', changefreq: 'yearly', priority: '0.3' },
    { loc: '/barrierefreiheit', changefreq: 'yearly', priority: '0.3' },
  ]

  const urls = pages
    .map(
      ({ loc, changefreq, priority }) =>
        `  <url>\n    <loc>${origin}${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
})
