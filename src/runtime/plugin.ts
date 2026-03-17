import type { Pinia, PiniaPluginContext } from 'pinia'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { destr } from 'destr'
import { createPersistence } from './core'
import { storages } from './storages'

const STORE_ID_REGEX = /%id/g

function piniaPlugin(context: PiniaPluginContext) {
  const config = useRuntimeConfig()
  const options = config.public.piniaPluginPersistedstate

  createPersistence(
    context,
    p => ({
      key: options.key
        ? options.key.replace(STORE_ID_REGEX, p.key ?? context.store.$id)
        : (p.key ?? context.store.$id),
      debug: p.debug ?? options.debug ?? false,
      serializer: p.serializer ?? {
        serialize: data => JSON.stringify(data),
        deserialize: data => destr(data),
      },
      storage: p.storage ?? (options.storage
        ? options.storage === 'cookies'
          ? storages.cookies(options.cookieOptions)
          : options.storage === 'indexedDB'
            ? storages.indexedDBStorage(options.indexedDBOptions)
            : storages[options.storage]()
        : storages.cookies()),
      beforeHydrate: p.beforeHydrate,
      afterHydrate: p.afterHydrate,
      pick: p.pick,
      omit: p.omit,
    }),
    options.auto ?? false,
  )
}

export default defineNuxtPlugin({
  name: 'pinia-plugin-persistedstate',
  async setup({ $pinia }) {
    const options = useRuntimeConfig().public.piniaPluginPersistedstate ?? {}
    const resolvePromises = []
    if (options.storage === 'indexedDB' || options.indexedDBOptions) {
      resolvePromises.push(storages.indexedDBStorage(options.indexedDBOptions).resolve!())
    }
    await Promise.all(resolvePromises)

    ;($pinia as Pinia).use(piniaPlugin)
  },
})
