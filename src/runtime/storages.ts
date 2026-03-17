import type { CookieOptions } from '#app'
import type { UseStore } from 'idb-keyval'
import type { StorageLike } from '../types'
import { useCookie, useRuntimeConfig } from '#app'
import { createStore, getMany, keys, set } from 'idb-keyval'

export type CookiesStorageOptions = Omit<
  CookieOptions,
  'default' | 'watch' | 'readonly' | 'filter'
>

/**
 * Cookie-based storage. Cookie options can be passed as parameter.
 * Uses Nuxt's `useCookie` under the hood.
 */
function cookies(options?: CookiesStorageOptions): StorageLike {
  return {
    getItem: key => useCookie<string | null>(
      key,
      {
        ...(options ?? useRuntimeConfig().public.piniaPluginPersistedstate.cookieOptions ?? {}),
        decode: options?.decode ?? decodeURIComponent,
        readonly: true,
      },
    ).value,
    setItem: (key, value) => useCookie<string>(
      key,
      {
        ...(options ?? useRuntimeConfig().public.piniaPluginPersistedstate.cookieOptions ?? {}),
        encode: options?.encode ?? encodeURIComponent,
      },
    ).value = value,
  }
}

/**
 * LocalStorage-based storage.
 * Warning: only works client-side.
 */
function localStorage(): StorageLike {
  return {
    getItem: key => import.meta.client
      ? window.localStorage.getItem(key)
      : null,
    setItem: (key, value) => import.meta.client
      ? window.localStorage.setItem(key, value)
      : null,
  }
}

/**
 * SessionStorage-based storage.
 * Warning: only works client-side.
 */
function sessionStorage(): StorageLike {
  return {
    getItem: key => import.meta.client
      ? window.sessionStorage.getItem(key)
      : null,
    setItem: (key, value) => import.meta.client
      ? window.sessionStorage.setItem(key, value)
      : null,
  }
}

export type AsyncStoreTypes = 'indexedDB'

export interface ResolvedAsyncData {
  [key: string]: {
    [key: string]: string
  }
}

export type ResolvedAsyncDataMap = {
  [key in AsyncStoreTypes]?: ResolvedAsyncData
}

const resolvedData: ResolvedAsyncDataMap = {}

export interface IndexedDBOptions {
  name?: string
  storeName?: string
  safeStores?: {
    name: string
    storeNames: string[]
  }[]
}

function indexedDBStorage(options?: IndexedDBOptions): StorageLike {
  const _options = options ?? useRuntimeConfig().public.piniaPluginPersistedstate.indexedDBOptions ?? {}
  const { name, storeName } = _options
  let customStore: UseStore | undefined
  if (name && storeName) {
    customStore = createStore(name, storeName)
  }

  return {
    getItem: (key) => {
      if (!import.meta.client)
        return null
      const resolveKey = `${name || 'default'}::${storeName ?? 'default'}`
      if (!resolvedData.indexedDB?.[resolveKey]) {
        return null
      }
      return resolvedData.indexedDB[resolveKey][key] || null
    },
    setItem: (key, value) => {
      if (!import.meta.client)
        return

      set(key, value, customStore).catch((_e) => {})
    },
    resolve: async () => {
      if (!import.meta.client)
        return
      resolvedData.indexedDB = resolvedData.indexedDB ?? {}

      const resolveKey = `${name || 'default'}::${storeName ?? 'default'}`
      if (!resolvedData.indexedDB[resolveKey]) {
        const resolved: {
          [key: string]: string
        } = {}
        resolvedData.indexedDB[resolveKey] = resolved
        const storeKeys: string[] = await keys(customStore)
        const data = await getMany(storeKeys, customStore)
        for (let i = 0; i < storeKeys.length; i++) {
          if (data[i] !== undefined) {
            resolved[storeKeys[i]!] = JSON.stringify(data[i])
          }
        }
      }
      const safeStores = _options.safeStores ?? []
      for (const store of safeStores) {
        for (const safeStoreName of store.storeNames) {
          const resolveSafeKey = `${store.name}::${safeStoreName}`
          if (resolvedData.indexedDB[resolveSafeKey]) {
            continue
          }
          const resolved: {
            [key: string]: string
          } = {}
          resolvedData.indexedDB[resolveSafeKey] = resolved
          const safeStore = createStore(store.name, safeStoreName)
          const storeKeys: string[] = await keys(safeStore)
          const data = await getMany(storeKeys, safeStore)
          for (let i = 0; i < storeKeys.length; i++) {
            if (data[i] !== undefined) {
              resolved[storeKeys[i]!] = JSON.stringify(data[i])
            }
          }
        }
      }
    },
  }
}

export const storages = {
  cookies,
  localStorage,
  sessionStorage,
  indexedDBStorage,
}
