# Perspective-Designsprache (1:1-Ziel)

Verbindliche visuelle Referenz für den MP Funnel-Builder. Ziel: möglichst 1:1 wie
perspective.co, gebrandet für Marketing Planet. Die Screenshots in diesem Ordner sind die
Wahrheit. Bei Abweichung zwischen Text und Screenshot gilt der Screenshot.

Bilder (verkleinert) in diesem Ordner, nach Bereich:
- `01-funnel-liste.jpg` Alle Funnels (Tabelle, CVR, Kontakt-Balken, Favoriten, Live-Badge)
- `02-mitglieder-einladen-rollen.jpg` Einladen-Modal + Rollen-Dropdown
- `03-editor-uebersicht-intro.jpg` Editor, Tab Übersicht, Handy-Frame-Vorschau
- `04-funnel-bild-auswahl-cards.jpg` Bild-Auswahl-Cards im Funnel
- `05-funnel-icon-choice-grid.jpg` 2x2 Icon-Auswahl-Grid
- `06-nachricht-email-editor.jpg` Nachrichten (E-Mail) Editor
- `07-section-hinzufuegen-liste.jpg` Sektion hinzufügen (Einfache/Interaktive Blöcke + Sektionen)
- `08-element-ausgewaehlt-formatierung.jpg` Block ausgewählt: Format-Panel + Verknüpfung + Floating-Toolbar
- `09-emoji-textformat.jpg` Emoji-Picker + Textformat
- `10-layout-panel-section.jpg` Layout-Panel bei Section-Auswahl
- `11-section-templates-ueberuns.jpg` / `12-section-templates-team.jpg` Section-Vorlagen mit Thumbnails
- `13-metriken-dashboard.jpg` Metriken (Charts)
- `14-funnel-einstellungen-modal.jpg` Funnel-Einstellungen-Modal
- `15-design-themes.jpg` Design-Tab: Theme-Galerie + Theme-ändern-Modal

## Farb-Tokens (aus Screenshots gesampelt)

App-Chrome (Perspective-eigene UI):
- `--ui-accent` Primärblau **#3579fa** (Buttons „Veröffentlichen", „Neuer Funnel", aktive Links, Auswahl-Outline)
- `--ui-accent-hover` ~ **#2f6fe6**
- `--ui-bg` App-/Canvas-Hintergrund **#f3f4f6** (gray-100)
- `--ui-surface` Flächen, Top-Bar, Panels, Cards, Handy-Frame **#ffffff**
- `--ui-border` Trennlinien/Rahmen **#e5e7eb** (gray-200)
- `--ui-text` Haupttext **#1f2937** (Headings wirken ~#353535)
- `--ui-text-muted` Sekundärtext **#6b7280** (gray-500)
- Live-Badge: Hintergrund **#e2fbe8**, Text Grün **#16a34a**
- Status-Balken Kontakte: Verlauf grün→gelb→rot (Kontaktstatus)

Funnel-Theme (Beispiel-Funnel, data-driven pro Funnel über Branding):
- Auswahl-/Button-Navy **#1c4687**, Text weiß. Heller Akzent-Blau im Funnel ~#3579fa.
- Default-Theme „MP" für neue Funnels: MP-Akzent als Primärfarbe (siehe unten), nicht Perspective-Blau.

## Branding-Hinweis

Die App-CHROME-Optik (Layout, Komponenten, Interaktion) wird 1:1 wie Perspective gebaut,
inklusive des klaren, hellen Looks. Der Chrome-Akzent darf Perspectives Blau **#3579fa** nutzen,
da der Auftrag „möglichst 1:1" lautet. Der FUNNEL-Inhalt nimmt pro Funnel das Kunden-Branding
(Default-Theme „MP" mit MP-Akzentfarbe), nicht die Chrome-Farbe.

## Typografie

- Schrift: Inter (oder sehr nahe System-Sans). Gewichte 400/500/600/700.
- Headings im Funnel groß und fett (Hero ~28-32px, bold). UI-Text 13-14px.
- UI ist kompakt, viel Weißraum, ruhige Graustufen.

## Layout-Strukturen

### Top-Bar (global, weiß, ~56px, untere 1px-Border)
- Workspace-Liste/Editor unterscheiden sich:
  - Funnel-Liste: links Workspace-Switcher (Name + Chevron), Mitte Tabs **Funnels · Performance · Inbox · Empfehlungen**, rechts „Einladen" + Avatar.
  - Editor: links Breadcrumb (Home-Icon + Funnel-Name), Mitte Tabs **Funnel · Metriken · Kontakte · Apps** (aktiver Tab als helle Pille mit Icon), rechts Vorschau-Auge, Zahnrad, **Veröffentlichen** (blau), `+`.

### Funnel-Liste („Alle Funnels")
- Große Überschrift „Alle Funnels" mit Sortier-Chevron. Rechts Such-Icon, Grid/Listen-Umschalter, „Neuer Funnel" (blau).
- Tabelle: Spalten Name (rundes Thumbnail + „zuletzt bearbeitet vor X"), Favorit (Stern), Status (Live-Badge grün + Link-Icon), CVR (%), Kontakte (Personen-Icon + Zahl), Kontaktstatus (horizontaler Verlaufsbalken), `…`-Menü.

### Editor (Tab Funnel)
- Linkes Panel (~260px, weiß) mit Tabs **Übersicht / Design**:
  - Übersicht: Abschnitte **Seiten** (nummerierte Seiten 1..n + „Seite hinzufügen"), **Ergebnisse** (A/B Ergebnisseiten + „Ergebnis hinzufügen"), **Nachrichten** (E-Mails + „Neue Nachricht"). Jeder Abschnitt mit Info-Icon.
  - Design: **Deine Themes** (+ neu) und **Perspective Themes** als Liste mit je 3-4 Farb-Swatches. Theme-ändern öffnet Modal („auf alle Blöcke" / „nur unangepasste").
- Mitte: großer Canvas in `--ui-bg`, zentriert ein **Handy-Frame** (weiße, abgerundete Karte, ~390px breit, dezenter Schatten) mit dem ECHTEN WYSIWYG-Funnel. Scrollbar innerhalb des Frames.
- Block-Interaktion: Klick selektiert einen Block (blauer 2px-Outline + kleines Label-Tag oben links wie „Antwort"/„Layout"); rechts daneben eine vertikale Floating-Toolbar (Duplizieren, Verschieben-Griff `=`, Löschen).
- Bei selektiertem Block wird das linke Panel zum Kontext-Editor: Format-Toolbar (Größen **S/M/L/XL/…**, **B/I/U**, Emoji, Link, zwei Farb-Swatches) und Abschnitt **Verknüpfung** (Nächste Seite, Ergebnis-Dropdown, Block-ID).
- „Sektion hinzufügen": Panel mit **Einfache Blöcke** / **Interaktive Blöcke** und darunter **Sektionen** (Titelbereich, Produkt, Handlungsaufforderung, Über uns, Quiz, Team, Kundenstimmen, Vertrauen), jede mit visuellen Thumbnail-Vorlagen.

### Gerenderter Funnel (im Frame und im öffentlichen Renderer identisch)
- Oben Logo, darunter optional kleiner Lead-Text, große fette Headline, kleine Info-Zeile mit Emojis.
- „Frage X von N" in Akzentfarbe, zentriert, darunter die Frage fett.
- Auswahl-Blöcke: volle Breite, abgerundete Cards in Theme-Farbe, Text weiß, deutlicher Abstand; alternativ 2x2-Grid mit Icon oben + Label.
- Bild-Auswahl: Card mit Bild oben + Titel + Beschreibung.
- Fuß: Imprint · Privacy · Cookies, dann verpflichtend „We use Perspective" → bei uns „Erstellt mit Marketing Planet" + MP-Logo.

### Metriken (Tab)
- Kennzahl-Cards (Besuche, Neue Conversions, Conversion Rate, Gesendete Nachrichten) mit großer Zahl + Info-Icon + „Keine Vergleichsdaten".
- Charts: Seite-zu-Seite-Konvertierung (Balken-Funnel mit %-Abfall), Conversion Rate über Zeit (Balken + Linie), Geräteverteilung, Kontaktentwicklung. (Charts erst im Metriken-Ausbau.)

## Komponenten-Stil

- Radius: Cards/Buttons ~8-10px, Inputs ~8px. Frame ~32px.
- Schatten: sehr dezent (`0 1px 2px rgba(0,0,0,.06)`), Frame etwas stärker.
- Buttons: primär = `--ui-accent` weiß; sekundär = weiß mit Border; ghost = nur Text.
- Aktive Tab-Pille: hellgrauer/weißer Hintergrund mit feiner Border + Icon, Rest grau.
- Sehr ruhige, präzise, professionelle Anmutung. Keine grellen Effekte.
