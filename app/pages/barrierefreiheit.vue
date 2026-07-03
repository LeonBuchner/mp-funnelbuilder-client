<script setup lang="ts">
/**
 * Erklaerung zur Barrierefreiheit (BFSG / EN 301 549).
 * Stand: 2026-06-30
 * Geltungsbereich: oeffentlicher Funnel-Renderer
 * Konformitaet: weitgehend konform mit WCAG 2.1 Level AA
 * Feedback-Kontakt: hello@marketing-planet.de
 */
useSeoMeta({
  title: 'Erklärung zur Barrierefreiheit - MP Funnel-Builder',
  description:
    'Erklärung zur Barrierefreiheit des MP Funnel-Builders gemäß BFSG und EN 301 549.',
})
</script>

<template>
  <div class="min-h-screen bg-white px-4 py-12">
    <div class="mx-auto max-w-2xl">
      <h1 class="mb-2 text-2xl font-bold text-gray-900">
        Erklärung zur Barrierefreiheit
      </h1>
      <p class="mb-8 text-sm text-gray-500">
        Stand: 30. Juni 2026
      </p>

      <section class="mb-8">
        <h2 class="mb-3 text-lg font-semibold text-gray-900">
          Geltungsbereich
        </h2>
        <p class="text-gray-700">
          Diese Erklärung gilt für den öffentlichen Funnel-Renderer des
          MP Funnel-Builders, erreichbar unter
          <span class="font-mono text-sm">funnels.marketing-planet.de/f/*</span>.
          Betreiber ist Marketing Planet, Kontakt: hello@marketing-planet.de.
        </p>
      </section>

      <section class="mb-8">
        <h2 class="mb-3 text-lg font-semibold text-gray-900">
          Konformitätsstatus
        </h2>
        <p class="text-gray-700">
          Der Funnel-Renderer ist
          <strong>weitgehend konform</strong>
          mit den Anforderungen der EN 301 549 (WCAG 2.1 Level AA). Die bekannten
          Einschränkungen sind im nächsten Abschnitt aufgeführt.
        </p>
      </section>

      <section class="mb-8">
        <h2 class="mb-3 text-lg font-semibold text-gray-900">
          Bekannte Einschränkungen
        </h2>
        <ul class="list-inside list-disc space-y-2 text-gray-700">
          <li>
            Funnels mit kundenspezifischen Themes können Kontrastverhältnisse
            aufweisen, die unter 4,5:1 liegen. Neue Themes werden vor der
            Veröffentlichung geprüft. (WCAG 1.4.3)
          </li>
          <li>
            Bild-Alternativtexte hängen von den Angaben der Funnel-Ersteller ab.
            Ist kein Text hinterlegt, wird ein leeres Alt-Attribut gesetzt.
            (WCAG 1.1.1)
          </li>
        </ul>
      </section>

      <section class="mb-8">
        <h2 class="mb-3 text-lg font-semibold text-gray-900">
          Feedback und Kontakt
        </h2>
        <p class="text-gray-700">
          Wenn Du eine Barriere entdeckst oder Unterstützung benötigst, schreib uns
          bitte eine E-Mail:
          <a
            href="mailto:hello@marketing-planet.de"
            class="rounded text-blue-700 underline hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            hello@marketing-planet.de
          </a>.
          Wir bemühen uns, innerhalb von sechs Wochen zu antworten.
        </p>
      </section>

      <section class="mb-8">
        <h2 class="mb-3 text-lg font-semibold text-gray-900">
          Durchsetzungsverfahren
        </h2>
        <p class="text-gray-700">
          Wenn Du nach einer Rückmeldung keine zufriedenstellende Antwort erhalten
          hast, kannst Du Dich an die zuständige Durchsetzungsstelle wenden. In
          Deutschland ist das die Schlichtungsstelle nach dem
          Behindertengleichstellungsgesetz (BGG).
        </p>
      </section>

      <p class="text-xs text-gray-600">
        Diese Erklärung wurde am 30. Juni 2026 erstellt.
      </p>

      <nav
        class="mt-10 flex flex-wrap gap-4 text-sm"
        aria-label="Zurück zur App"
      >
        <a
          href="/"
          class="rounded text-blue-700 underline hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Zur Startseite
        </a>
        <a
          href="/impressum"
          class="rounded text-blue-700 underline hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Impressum
        </a>
        <a
          href="/datenschutz"
          class="rounded text-blue-700 underline hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Datenschutz
        </a>
      </nav>
    </div>
  </div>
</template>
