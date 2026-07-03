<script setup lang="ts">
const { toasts, remove } = useToast()
</script>

<template>
  <!-- role="log" erlaubt aria-label und hat implizit aria-live="polite" -->
  <div
    class="fixed right-4 top-4 z-50 flex flex-col gap-2"
    role="log"
    aria-label="Benachrichtigungen"
    aria-live="polite"
    aria-atomic="false"
  >
    <TransitionGroup
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-x-8"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-8"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'flex min-w-64 max-w-sm items-start gap-3 rounded-lg px-4 py-3 shadow-lg',
          toast.type === 'success' && 'bg-green-600 text-white',
          toast.type === 'error' && 'bg-red-600 text-white',
          toast.type === 'info' && 'bg-slate-800 text-white',
        ]"
        role="alert"
      >
        <span class="flex-1 text-sm font-medium">{{ toast.message }}</span>
        <button
          type="button"
          class="ml-1 flex-shrink-0 rounded p-0.5 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          :aria-label="`Benachrichtigung schließen: ${toast.message}`"
          @click="remove(toast.id)"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
