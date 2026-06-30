import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../../app/stores/app'

describe('useAppStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('hat initial ready = false', () => {
    const store = useAppStore()
    expect(store.ready).toBe(false)
  })

  it('setzt ready auf true via setReady', () => {
    const store = useAppStore()
    store.setReady(true)
    expect(store.ready).toBe(true)
  })

  it('setzt ready wieder auf false', () => {
    const store = useAppStore()
    store.setReady(true)
    store.setReady(false)
    expect(store.ready).toBe(false)
  })
})
