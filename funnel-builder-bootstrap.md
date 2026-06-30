# Bootstrap und Projektauftrag: Funnel-Builder (Perspective-Klon)

> Eine Datei, mehr brauchst Du nicht anzulegen. Im Repo-Ordner (auch leer) `claude` starten und sagen: „Lies @funnel-builder-bootstrap.md und arbeite die Anweisung ab." Claude richtet Repo, Stack und die Projekt-CLAUDE.md selbst ein und legt dann los.
> Einzige Voraussetzung: die globalen Agenten (planner, frontend-dev, backend-dev, review, security, perf, a11y, seo) und der Command /milestone-abnahme liegen in ~/.claude. Das ist eine einmalige Sache pro Rechner.

## Anweisung an Claude (in dieser Reihenfolge abarbeiten)

1. **Greenfield.** Das ist ein neues Projekt. Du richtest alles selbst ein, der Nutzer legt nichts manuell an. Frage nicht nach Dingen, die in dieser Datei schon entschieden sind.
2. **Planen zuerst.** Nutze den `planner` (Plan-Modus, noch nichts schreiben): lies diesen Auftrag und schlage Architektur, Datenmodell, Repo-Struktur und Meilensteine mit prüfbaren Abnahmekriterien vor. Schneide den ersten Meilenstein als production-ready Kern (Funnel bauen, veröffentlichen, Lead erfassen, Basis-Metriken). Leg den Plan dem Nutzer vor und warte auf Freigabe.
3. **Nach Freigabe einrichten.** Scaffolde das Repo gemäß Plan: Laravel (API) und Nuxt (Builder + Renderer), Tailwind, Pest, Vitest, Playwright, `git init`, Feature-Branch. Schreibe danach eine Projekt-`CLAUDE.md`, die die Standards unten übernimmt und die echten Versionen und Befehle einträgt, die Du gerade eingerichtet hast. Commit.
4. **Bauen.** Arbeite Meilenstein 1 Baustein für Baustein ab. Delegiere an `frontend-dev` / `backend-dev`. Jeder Edit wird dem Nutzer zur Bestätigung vorgelegt.
5. **Abnahme.** Am Ende jedes Meilensteins `/milestone-abnahme`. Der Nutzer nimmt den Diff ab. **Nichts merged und nichts blockt automatisch.**

## Verbindliche Standards (gelten in jedem Meilenstein, ohne Ausnahme)

Production-ready ist Pflicht, nicht optional. Die Staffelung betrifft nur den Umfang je Meilenstein, nie die Qualität. Die Architektur (Datenmodell, Zwei-Oberflächen-Trennung, Mehrmandantenfähigkeit, Auth, versioniertes Block-Schema, Renderer-Performance, DSGVO-Fundament) wird von Tag eins auf die volle Vision ausgelegt, nicht ge-MVP-t.

**Schreibstil (alle Texte, UI-Copy):** keine Gedankenstriche (—), klingt nach KI. Du-Form groß (Du, Dir, Deine). Bodenständig, direkt, kein Marketing-Sprech.

**Coding-Standards:** TypeScript strict, kein `any` ohne begründeten Kommentar. Laravel: Validierung in Form Requests, keine N+1 (eager loading), Mass-Assignment absichern, Autorisierung über Policies. Keine Secrets im Code. Semantisches HTML von Anfang an.

**Tests:** Unit + Feature für kritische Pfade (Auth, Lead-Submit, Bezahlung gibt es nicht, Kern-Logik). Pest im Backend, Vitest + Playwright im Frontend.

**Qualitäts-Schwellen:** Accessibility WCAG 2.1 AA + BFSG (EN 301 549, Erklärung zur Barrierefreiheit). Performance Lighthouse >= 90 in allen Kategorien, besonders der Renderer. Security OWASP + `composer audit` / `npm audit` + DSGVO-Datenflüsse. SEO Title/Meta, sinnvolles Schema, sprechende Bild-Dateinamen.

**Sicherheit:** vor Edits und Befehlen nachfragen. Auf Feature-Branch arbeiten, Checkpoint-Commits. Nie automatisch auf Prod deployen.

## Stack (Greenfield, Du richtest ihn ein)

- Laravel (aktuelle stabile Version), PHP aktuell.
- Nuxt (aktuelle stabile Version) / Vue 3 Composition API, TypeScript strict.
- Tailwind, Pinia. Tests: Pest, Vitest, Playwright.
- Monorepo: `/api` (Laravel) und `/web` (Nuxt). Builder und Renderer als getrennte Bereiche im Frontend, genaue Aufteilung schlägt der `planner` vor.
- Voraussichtliche Befehle (im Zweifel die echten aus dem Scaffold übernehmen und in die CLAUDE.md schreiben): `composer install && npm install`, `php artisan serve` / `npm run dev`, `./vendor/bin/pest`, `npm run test && npx playwright test`, `npm run build`, `./vendor/bin/pint --test`.

## 1. Ziel

Mobile-first Funnel-Builder nach Vorbild von Perspective (perspective.co), für die Eigennutzung von Marketing Planet und für Kunden. Ein Funnel ist eine mehrstufige, interaktive Strecke (Tap/Swipe, quizartig), die Besucher durchlaufen, Fragen beantworten und am Ende Kontaktdaten hinterlassen. Ziel: Leadgenerierung mit hoher Conversion, ohne Programmierung.

## 2. Nutzer und Mandanten

- **Marketing Planet:** legt Funnels an und baut sie, verwaltet Kunden, sieht alles.
- **Kunden:** eigener Workspace, nur Lese-Zugriff auf Metriken und Leads. Kunden bauen nicht selbst.
- **Funnel-Besucher (Leads):** durchlaufen den veröffentlichten Funnel, anonym bis zur Dateneingabe.

Mehrmandantenfähig mit eigenem Workspace je Kunde. Weil Kunden nur ansehen, ist der Builder rein MP-intern, der Kundenbereich eine schlanke Read-only-Ansicht.

## 3. Architektur-Kern: zwei Oberflächen

1. **Admin/Builder-App** (eingeloggt, MP-Team): Dashboard, Funnel-Liste, Drag-and-Drop-Editor, Metriken, Lead-Verwaltung, Vorlagen-Galerie. Kundenbereich als Read-only-Sicht.
2. **Öffentlicher Funnel-Renderer** (ohne Login): rendert den veröffentlichten Funnel, mobile-first, blitzschnell (PWA, unter 3 s), führt durch die Schritte, wertet Logik aus, nimmt das Formular entgegen, feuert Tracking-Events, zeigt am Ende das MP-Logo.

Funnel mit Entwurfs- und Veröffentlichungsstand (Versionierung), damit Bearbeitung und Live-Stand getrennt sind und A/B-Varianten möglich werden.

**Veröffentlichungs-URLs:** Standard Hash-Pfad auf funnels.marketing-planet.de/<hash>, plus optionale Custom-Domain je Kunde.

## 4. In Scope

**Funnel-Builder (Drag and Drop, WYSIWYG, mobile-first):** Seiten/Steps mit Animationen und Fortschrittsanzeige; Inhaltsblöcke (Text, Bild mit Upload + Stockbibliothek, Video Upload + Embed, Icons, Buttons mit externen Links); interaktive Blöcke (Einfach-/Mehrfachauswahl, Eingabefelder inkl. Telefon mit Ländervorwahl, Datum/Zeit, Dropdown, Datei-Upload für Lebenslauf, Opt-in mit Double-Opt-in/OTP); Logik (bedingte Pfade, AND/OR, Ergebnisseiten); Layout (Karten, Spalten, Header mit Logo, Konfetti); Personalisierung (dynamische Überschriften per URL/UTM, eingegebene Daten wieder anzeigen); Branding je Funnel (Farben, eigene Schriftarten, Logo, Favicon, CI-Designs speichern); Bauhilfen (Blöcke/Seiten/Funnels kopieren, Vorlagen).

**Pflicht-Branding:** jeder Funnel zeigt am Ende verpflichtend das Marketing-Planet-Logo, für Kunden nicht entfernbar, nur MP-Admin konfiguriert es.

**A/B-Testing:** Varianten eines Funnels, Traffic-Split, Besucher per Cookie fest zugeordnet, Conversion = Lead, statistische Signifikanz, Gewinner übernehmbar.

**Metriken:** Views, Starts, Schritt-für-Schritt-Absprung, Abschluss- und Conversion-Rate, Aufschlüsselung nach Gerät/Tageszeit/Button-Klicks, Antworten-Insights, UTM-Erfassung, Zeitraum-Auswahl, anpassbares Dashboard, Screenshot-Export. Tracking-Pixel je Funnel: GA4 + Meta, nur nach Consent.

**Lead-Verwaltung:** zentrale Liste je Workspace und Funnel, pro Lead die Felder plus alle Antworten, Detailansicht, Status/Tags, Filter/Suche, CSV-Export. E-Mail-Benachrichtigung bei neuem Lead an MP und Kunde.

**Demo-Funnels (alle vier zum Launch, Reihenfolge schlägt der planner vor):** Mitarbeiter gewinnen (Recruiting mit optionalem Lebenslauf-Upload), Termine generieren, E-Mail-Liste aufbauen (mit Double-Opt-in), Anfrage/Verkauf (B2B).

## 5. Ausdrücklich NICHT im Scope (vorerst)

- Keine Zahlungsanbieter, kein Payment-Block.
- Keine externen Integrationen wie Zapier oder HubSpot, kein CRM-Sync.
- Keine Messaging-Automationen über Lead-Benachrichtigung und Double-Opt-in-Mail hinaus.
- Kunden bauen keine Funnels selbst.

## 6. DSGVO und Qualität (Projektspezifisch)

Leads sind personenbezogene Daten. Consent vor jedem Tracking (auch GA4/Meta-Pixel), Datensparsamkeit, sichere Speicherung von Daten und Datei-Uploads, Lösch- und Auskunftskonzept. Double-Opt-in für verifizierte Leads. Block-Modell als versioniertes JSON-Schema, damit Entwurf, Veröffentlichung und A/B-Varianten sauber auseinandergehen.

## 7. Verbindliche Entscheidungen

1. Eigener Workspace je Kunde.
2. Rollen: MP-Admin (alles), MP-Team (baut in Kunden-Workspaces), Kunde (nur ansehen: Metriken + Leads).
3. URLs: Standard Hash-Pfad auf funnels.marketing-planet.de/<hash>, plus optionale Custom-Domain je Kunde.
4. Tracking-Pixel GA4 + Meta je Funnel, nur nach Consent.
5. Double-Opt-in / OTP von Anfang an.
6. Datei-Upload (Lebenslauf) von Anfang an.
7. Lead-Benachrichtigung per E-Mail an MP und Kunde.
8. Demo-Funnel-Typen zum Launch: Mitarbeiter gewinnen, Termine generieren, E-Mail-Liste, Anfrage/Verkauf (B2B).

## 8. Risiken, die der planner einplanen soll

Editor-Komplexität (das dickste Brett), Renderer-Performance, DSGVO bei Leads und Datei-Uploads, Mehrmandantenfähigkeit, Custom-Domains samt SSL.
