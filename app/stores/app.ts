import { defineStore } from 'pinia'

interface AppState {
  ready: boolean
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    ready: false,
  }),

  actions: {
    setReady(value: boolean): void {
      this.ready = value
    },
  },
})
