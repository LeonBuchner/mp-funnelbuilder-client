/**
 * Sektions-Vorlagen für den Funnel-Editor.
 *
 * Jede Vorlage ist eine Factory (`create`), die ein frisches Array von
 * Blöcken mit neuen UUIDs erzeugt. Die Texte folgen dem Projektschreibstil:
 * Du-Form (großes Du/Dir/Dich), keine Gedankenstriche.
 *
 * Verwendung:
 *   const { sectionTemplates } = useSectionTemplates()
 *   const blocks = sectionTemplates.find(t => t.key === 'titelbereich')!.create()
 */

import type {
  Block,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  LogoBlock,
  SingleChoiceBlock,
  ProgressIndicatorBlock,
} from '~/types/funnel'

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type SectionKey =
  | 'titelbereich'
  | 'produkt'
  | 'handlungsaufforderung'
  | 'ueber-uns'
  | 'quiz'
  | 'team'
  | 'kundenstimmen'
  | 'vertrauen'

export interface SectionTemplateDefinition {
  key: SectionKey
  label: string
  /** Kurze Beschreibung für Screen-Reader und Tooltips */
  description: string
  create: () => Block[]
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen (kein Export nötig, nur intern)
// ---------------------------------------------------------------------------

function mkText(content: string, styles?: Record<string, string>): TextBlock {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    content,
    ...(styles ? { styles } : {}),
  }
}

function mkImage(alt: string): ImageBlock {
  return {
    id: crypto.randomUUID(),
    type: 'image',
    url: '',
    alt,
  }
}

function mkButton(label: string): ButtonBlock {
  return {
    id: crypto.randomUUID(),
    type: 'button',
    label,
    action: 'next',
    style: 'primary',
  }
}

function mkLogo(): LogoBlock {
  return {
    id: crypto.randomUUID(),
    type: 'logo',
    url: '',
    alt: 'Logo',
  }
}

function mkProgress(): ProgressIndicatorBlock {
  return {
    id: crypto.randomUUID(),
    type: 'progress_indicator',
    currentStep: 1,
    totalSteps: 3,
    label: 'Frage',
    progressStyle: 'bar',
  }
}

function mkChoice(question: string): SingleChoiceBlock {
  return {
    id: crypto.randomUUID(),
    type: 'single_choice',
    fieldKey: `choice_${crypto.randomUUID().slice(0, 8)}`,
    required: false,
    question,
    options: [
      { id: crypto.randomUUID(), label: 'Option A', value: 'option_a' },
      { id: crypto.randomUUID(), label: 'Option B', value: 'option_b' },
      { id: crypto.randomUUID(), label: 'Option C', value: 'option_c' },
    ],
    imageLayout: 'none',
    autoAdvance: false,
  }
}

// ---------------------------------------------------------------------------
// Vorlagen-Definitionen
// ---------------------------------------------------------------------------

const TEMPLATES: SectionTemplateDefinition[] = [
  {
    key: 'titelbereich',
    label: 'Titelbereich',
    description: 'Logo, Hauptüberschrift, Kurztext und Startbutton',
    create: (): Block[] => [
      mkLogo(),
      mkText('<p>Deine Hauptaussage in einem Satz.</p>', { textSize: 'hero' }),
      mkText('<p>Kurz erklären, was Dich erwartet und warum es sich lohnt weiterzumachen.</p>'),
      mkButton('Jetzt starten'),
    ],
  },
  {
    key: 'produkt',
    label: 'Produkt',
    description: 'Produktbild, Name, Beschreibung und Kaufbutton',
    create: (): Block[] => [
      mkImage('Produktbild'),
      mkText('<p>Dein Produkt oder Angebot</p>', { textSize: 'xl' }),
      mkText('<p>Kurze Beschreibung, die den Mehrwert auf den Punkt bringt.</p>'),
      mkButton('Mehr erfahren'),
    ],
  },
  {
    key: 'handlungsaufforderung',
    label: 'Handlungsaufforderung',
    description: 'Überschrift, Kurztext und Call-to-Action-Button',
    create: (): Block[] => [
      mkText('<p>Bereit loszulegen?</p>', { textSize: 'xl' }),
      mkText('<p>Füll das Formular aus und wir melden uns bei Dir.</p>'),
      mkButton('Jetzt bewerben'),
    ],
  },
  {
    key: 'ueber-uns',
    label: 'Über uns',
    description: 'Bild, Überschrift und Absatztext für Vorstellung',
    create: (): Block[] => [
      mkImage('Unser Team'),
      mkText('<p>Wer steckt dahinter?</p>', { textSize: 'xl' }),
      mkText(
        '<p>Wir sind ein engagiertes Team mit dem Ziel, Dir zu helfen. Lerne uns kennen und erfahre, was uns antreibt.</p>',
      ),
    ],
  },
  {
    key: 'quiz',
    label: 'Quiz',
    description: 'Fortschrittsanzeige, Frage und Auswahlantworten',
    create: (): Block[] => [
      mkProgress(),
      mkText('<p>Welche Herausforderung beschäftigt Dich gerade am meisten?</p>'),
      mkChoice('Welche Herausforderung beschäftigt Dich gerade am meisten?'),
    ],
  },
  {
    key: 'team',
    label: 'Team',
    description: 'Überschrift, Foto und Name mit Rolle',
    create: (): Block[] => [
      mkText('<p>Lerne unser Team kennen</p>', { textSize: 'xl' }),
      mkImage('Team-Mitglied'),
      mkText('<p>Vorname Nachname, Funktion</p>'),
    ],
  },
  {
    key: 'kundenstimmen',
    label: 'Kundenstimmen',
    description: 'Überschrift, Zitat und Autorenzeile',
    create: (): Block[] => [
      mkText('<p>Was unsere Kunden sagen</p>', { textSize: 'xl' }),
      mkText(
        '<p>Die Zusammenarbeit war großartig. Das Ergebnis hat unsere Erwartungen übertroffen.</p>',
      ),
      mkText('<p>Maria S., Geschäftsführerin</p>'),
    ],
  },
  {
    key: 'vertrauen',
    label: 'Vertrauen',
    description: 'Überschrift, Referenztext und Logobild',
    create: (): Block[] => [
      mkText('<p>Darauf vertrauen schon viele</p>', { textSize: 'xl' }),
      mkText('<p>Referenzen, Partner und Auszeichnungen zeigen, dass Du gut aufgehoben bist.</p>'),
      mkImage('Partner-Logos'),
    ],
  },
]

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useSectionTemplates() {
  return { sectionTemplates: TEMPLATES }
}
