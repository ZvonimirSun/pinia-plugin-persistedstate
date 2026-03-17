import type { PiniaPluginContext, StateTree, Store, StoreGeneric } from 'pinia'
import type { Persistence, PersistenceOptions } from '../types'
import { deepOmitUnsafe, deepPickUnsafe } from 'deep-pick-omit'

function isAsyncStorage(storage: Persistence['storage']) {
  return typeof storage.resolve === 'function'
}

function hydrateStore(
  store: Store,
  {
    storage,
    serializer,
    key,
    debug,
    pick,
    omit,
    beforeHydrate,
    afterHydrate,
  }: Persistence,
  context: PiniaPluginContext,
  runHooks = true,
) {
  try {
    if (runHooks)
      beforeHydrate?.(context)

    const fromStorage = storage.getItem(key)
    if (fromStorage) {
      const deserialized = serializer.deserialize(fromStorage)
      const picked = pick
        ? deepPickUnsafe(deserialized, pick)

        : deserialized
      const omitted = omit
        ? deepOmitUnsafe(picked, omit)
        : picked
      store.$patch(omitted)
    }

    if (runHooks)
      afterHydrate?.(context)
  }
  catch (error) {
    if (debug)
      console.error('[pinia-plugin-persistedstate]', error)
  }
}

function persistState(
  state: StateTree,
  {
    storage,
    serializer,
    key,
    debug,
    pick,
    omit,
  }: Persistence,
) {
  try {
    const picked = pick
      ? deepPickUnsafe(state, pick)
      : state
    const omitted = omit
      ? deepOmitUnsafe(picked, omit)
      : picked
    const toStorage = serializer.serialize(omitted)
    storage.setItem(key, toStorage)
  }
  catch (error) {
    if (debug)
      console.error('[pinia-plugin-persistedstate]', error)
  }
}

export function createPersistence(
  context: PiniaPluginContext,
  optionsParser: (p: PersistenceOptions) => Persistence,
  auto: boolean,
) {
  const { pinia, store, options: { persist = auto } } = context

  if (!persist)
    return

  // HMR handling, ignore stores created as 'hot' stores
  if (!(store.$id in pinia.state.value)) {
    // @ts-expect-error `_s` is a stripped @internal
    const originalStore = (pinia._s as Map<string, StoreGeneric>).get(store.$id.replace('__hot:', ''))
    if (originalStore)
      void Promise.resolve().then(() => originalStore.$persist())
    return
  }

  const persistenceOptions = Array.isArray(persist)
    ? persist
    : persist === true
      ? [{}]
      : [persist]

  const persistences = persistenceOptions.map(optionsParser)
  const warnedStores = new Set<string>()

  function warnAsyncStoreMethod(key: string, method: '$hydrate' | '$persist') {
    const warnedKey = `${method}:${key}`
    if (warnedStores.has(warnedKey))
      return

    warnedStores.add(warnedKey)
    console.warn(
      `[pinia-plugin-persistedstate] ${method}() was skipped for key "${key}" because this storage is asynchronous.`,
    )
  }

  store.$hydrate = ({ runHooks = true } = {}) => {
    persistences.forEach((p) => {
      if (isAsyncStorage(p.storage)) {
        if (p.debug) {
          warnAsyncStoreMethod(p.key, '$hydrate')
        }
        return
      }

      hydrateStore(store, p, context, runHooks)
    })
  }

  store.$persist = () => {
    persistences.forEach((p) => {
      if (isAsyncStorage(p.storage)) {
        if (p.debug) {
          warnAsyncStoreMethod(p.key, '$persist')
        }
        return
      }

      persistState(store.$state, p)
    })
  }

  persistences.forEach((p) => {
    hydrateStore(store, p, context)

    store.$subscribe(
      (_mutation, state) => persistState(state, p),
      { detached: true },
    )
  })
}
