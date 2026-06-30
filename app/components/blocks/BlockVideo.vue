<script setup lang="ts">
/**
 * BlockVideo – YouTube- oder Vimeo-Einbettung.
 *
 * Sicherheit:
 *   - URL wird per Regex geparst. Kein innerHTML, kein v-html, kein dynamisches Script.
 *   - Nur bekannte Embed-Domains (youtube.com/embed, player.vimeo.com).
 *   - iframe-Attribute: loading="lazy", title fuer Screenreader.
 *
 * Autoplay:
 *   - Im SSR wird KEIN autoplay-Parameter gesetzt (verhindert Hydration-Mismatch).
 *   - Auf dem Client wird autoplay nach dem Mount ergaenzt (nur wenn block.autoplay = true).
 *   - Das iframe-src wird clientseitig aktualisiert; der Browser laedt das Video neu,
 *     aber da die Seite bereits geladen ist, ist das akzeptabel.
 */
import type { VideoBlock } from '~/types/funnel'

const props = defineProps<{
  block: VideoBlock
  mode: 'editor' | 'live'
}>()

/** Wird erst nach dem Mount auf dem Client auf true gesetzt. */
const isClient = ref(false)
onMounted(() => {
  isClient.value = true
})

/**
 * Parst eine YouTube- oder Vimeo-URL zu einer sicheren Embed-URL.
 * Gibt null zurueck fuer leere oder ungueltige URLs.
 *
 * Unterstuetzte Formate:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID (bereits eingebettet)
 *   - https://vimeo.com/VIDEO_ID
 *   - https://player.vimeo.com/video/VIDEO_ID (bereits eingebettet)
 */
function parseVideoUrl(url: string): { embedUrl: string; provider: 'youtube' | 'vimeo' } | null {
  if (!url || !url.trim()) return null

  // YouTube watch?v= oder youtu.be/
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  )
  if (ytMatch?.[1]) {
    return { embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`, provider: 'youtube' }
  }

  // Vimeo vimeo.com/ID oder player.vimeo.com/video/ID
  const vimeoMatch = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/)
  if (vimeoMatch?.[1]) {
    return { embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`, provider: 'vimeo' }
  }

  return null
}

const parsed = computed(() => parseVideoUrl(props.block.url))

/** Vollstaendige Embed-URL inkl. optionaler Query-Parameter. */
const embedSrc = computed<string | null>(() => {
  const result = parsed.value
  if (!result) return null

  const params = new URLSearchParams()

  // Autoplay nur auf dem Client setzen (kein SSR-Autoplay).
  if (isClient.value && props.block.autoplay) {
    params.set('autoplay', '1')
    // Vimeo: muted erforderlich fuer Autoplay ohne Nutzer-Interaktion
    if (result.provider === 'vimeo') params.set('muted', '1')
    // YouTube: mute erforderlich fuer Autoplay
    if (result.provider === 'youtube') params.set('mute', '1')
  }

  // Controls ausblenden
  if (props.block.showControls === false) {
    if (result.provider === 'youtube') params.set('controls', '0')
    if (result.provider === 'vimeo') params.set('controls', '0')
  }

  const query = params.toString()
  return result.embedUrl + (query ? `?${query}` : '')
})

/** Zugaenglicher Titel fuer den iframe. */
const iframeTitle = computed(() => {
  const provider = parsed.value?.provider
  if (provider === 'youtube') return 'YouTube-Video'
  if (provider === 'vimeo') return 'Vimeo-Video'
  return 'Eingebettetes Video'
})
</script>

<template>
  <div class="w-full">
    <!-- Gueltiger Embed -->
    <div
      v-if="embedSrc"
      class="relative w-full overflow-hidden rounded-[var(--funnel-radius)]"
      style="padding-top: 56.25%"
    >
      <iframe
        :src="embedSrc"
        :title="iframeTitle"
        class="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      />
    </div>

    <!-- Platzhalter im editor-Modus bei leerer/ungueltiger URL -->
    <div
      v-else-if="mode === 'editor'"
      class="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-[var(--funnel-radius)] border-2 border-dashed border-gray-200 bg-gray-50"
      aria-hidden="true"
    >
      <svg
        class="h-10 w-10 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
        />
      </svg>
      <span class="text-xs text-gray-400">YouTube- oder Vimeo-URL eingeben</span>
    </div>
  </div>
</template>
