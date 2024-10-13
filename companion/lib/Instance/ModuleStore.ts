import LogController from '../Log/Controller.js'
import type { ClientSocket, UIHandler } from '../UI/Handler.js'
import type {
	ModuleStoreListCacheEntry,
	ModuleStoreListCacheStore,
	ModuleStoreModuleInfoStore,
	ModuleStoreModuleInfoVersion,
} from '@companion-app/shared/Model/ModulesStore.js'
import type { DataCache } from '../Data/Cache.js'
import { cloneDeep } from 'lodash-es'

const ModuleStoreListRoom = 'module-store:list'
const ModuleStoreInfoRoom = (moduleId: string) => `module-store:info:${moduleId}`

const CacheStoreListKey = 'module_store_list'
const CacheStoreModuleTable = 'module_store'

const SUBSCRIBE_REFRESH_INTERVAL = 1000 * 60 * 60 * 6 // Update when a user subscribes to the data, if older than 6 hours

export class ModuleStoreService {
	readonly #logger = LogController.createLogger('Instance/ModuleStoreService')

	/**
	 */
	readonly #cacheStore: DataCache

	/**
	 * The core interface client
	 */
	readonly #io: UIHandler

	/**
	 */
	#listStore: ModuleStoreListCacheStore

	#infoStore = new Map<string, ModuleStoreModuleInfoStore>()

	constructor(io: UIHandler, cacheStore: DataCache) {
		this.#io = io
		this.#cacheStore = cacheStore

		this.#listStore = cacheStore.getKey(CacheStoreListKey, {
			lastUpdated: 0,
			modules: {},
		} satisfies ModuleStoreListCacheStore)

		// HACK: ensure the table exists
		const cloud = cacheStore.store.prepare(
			`CREATE TABLE IF NOT EXISTS ${CacheStoreModuleTable} (id STRING UNIQUE, value STRING);`
		)
		cloud.run()

		this.#infoStore = new Map(Object.entries(cacheStore.getTable(CacheStoreModuleTable) ?? {}))

		// If this is the first time we're running, refresh the store data now
		if (this.#listStore.lastUpdated === 0) {
			setImmediate(() => this.refreshStoreListData())
		}
		// TODO - setup some better interval stuff, so that we can notify the user of updates they can install
	}

	#getCacheEntryForModule(moduleId: string): ModuleStoreModuleInfoStore | null {
		// return this.#cacheStore.getTableKey(CacheStoreModuleTable, moduleId) ?? null
		return this.#infoStore.get(moduleId) ?? null
	}

	/**
	 * Setup a new socket client's events
	 */
	clientConnect(client: ClientSocket): void {
		client.onPromise('modules-store:list:refresh', async () => {
			this.refreshStoreListData()
		})

		client.onPromise('modules-store:list:subscribe', async () => {
			client.join(ModuleStoreListRoom)

			// Check if the data is stale enough to refresh
			if (this.#listStore.lastUpdated < Date.now() - SUBSCRIBE_REFRESH_INTERVAL) {
				this.refreshStoreListData()
			}

			return this.#listStore
		})

		client.onPromise('modules-store:list:unsubscribe', async () => {
			client.leave(ModuleStoreListRoom)
		})

		client.onPromise('modules-store:info:refresh', async (moduleId) => {
			this.#refreshStoreInfoData(moduleId)
		})

		client.onPromise('modules-store:info:subscribe', async (moduleId) => {
			client.join(ModuleStoreInfoRoom(moduleId))

			const data = this.#getCacheEntryForModule(moduleId)

			// Check if the data is stale enough to refresh
			if (!data || data.lastUpdated < Date.now() - SUBSCRIBE_REFRESH_INTERVAL) {
				this.#refreshStoreInfoData(moduleId)
			}

			return data
		})

		client.onPromise('modules-store:info:unsubscribe', async (moduleId) => {
			client.leave(ModuleStoreInfoRoom(moduleId))
		})
	}

	getCachedModuleVersionInfo(moduleId: string, versionId: string): ModuleStoreModuleInfoVersion | null {
		const moduleInfo = this.#getCacheEntryForModule(moduleId)

		if (!moduleInfo) return null

		return moduleInfo.versions.find((v) => v.id === versionId) ?? null
	}

	#isRefreshingStoreData = false
	refreshStoreListData(): void {
		if (this.#isRefreshingStoreData) return
		this.#isRefreshingStoreData = true

		Promise.resolve()
			.then(async () => {
				this.#io.emit('modules-store:list:progress', 0)

				// Simulate a delay
				await new Promise((resolve) => setTimeout(resolve, 1000))
				this.#io.emit('modules-store:list:progress', 0.2)
				await new Promise((resolve) => setTimeout(resolve, 2000))
				this.#io.emit('modules-store:list:progress', 0.6)
				await new Promise((resolve) => setTimeout(resolve, 2000))

				// TODO - fetch and transform this from the api once it exists
				this.#listStore = {
					lastUpdated: Date.now(),
					modules: cloneDeep(tmpStoreListData),
				}

				this.#cacheStore.setKey(CacheStoreListKey, this.#listStore)

				this.#io.emitToRoom(ModuleStoreListRoom, 'modules-store:list:data', this.#listStore)
				this.#io.emit('modules-store:list:progress', 1)
			})
			.catch((e) => {
				// TODO - what to do in this situation?
				// This could be on an always offline system
			})
			.finally(() => {
				this.#isRefreshingStoreData = false
			})
	}

	readonly #isRefreshingStoreInfo = new Set<string>()
	#refreshStoreInfoData(moduleId: string): void {
		if (this.#isRefreshingStoreInfo.has(moduleId)) return
		this.#isRefreshingStoreInfo.add(moduleId)

		Promise.resolve()
			.then(async () => {
				this.#io.emit('modules-store:info:progress', moduleId, 0)

				// Simulate a delay
				await new Promise((resolve) => setTimeout(resolve, 1000))
				this.#io.emit('modules-store:info:progress', moduleId, 0.2)
				await new Promise((resolve) => setTimeout(resolve, 1000))

				const data: ModuleStoreModuleInfoStore = {
					id: moduleId,
					lastUpdated: Date.now(),

					versions: [
						{
							id: '5.4.3',
							isPrerelease: false,
							releasedAt: new Date('2021-01-01').getTime(),
							tarUrl: 'https://builds.julusian.dev/companion-builds/pkg%20(2).tgz',
						},
						{
							id: '5.4.2',
							isPrerelease: true,
							releasedAt: new Date('2021-01-01').getTime(),
							tarUrl: 'https://builds.julusian.dev/companion-builds/pkg%20(2).tgz',
						},
						{
							id: '5.4.1',
							isPrerelease: true,
							releasedAt: new Date('2021-01-01').getTime(),
							tarUrl: 'https://builds.julusian.dev/companion-builds/pkg%20(2).tgz',
						},
						{
							id: '3.14.0',
							isPrerelease: false,
							releasedAt: new Date('2021-01-02').getTime(),
							tarUrl: null,
						},
						{
							id: '3.14.1',
							isPrerelease: false,
							releasedAt: new Date('2021-01-02').getTime(),
							tarUrl: 'https://builds.julusian.dev/companion-builds/atem-test-3.14.1.tgz',
						},
						{
							id: '3.13.0',
							isPrerelease: false,
							releasedAt: new Date('2021-01-02').getTime(),
							tarUrl: null,
						},
					],
				}
				this.#infoStore.set(moduleId, data)

				this.#cacheStore.setTableKey(CacheStoreModuleTable, moduleId, data)

				this.#io.emitToRoom(ModuleStoreInfoRoom(moduleId), 'modules-store:info:data', moduleId, data)
				this.#io.emit('modules-store:info:progress', moduleId, 1)
			})
			.catch((e) => {
				// TODO - what to do in this situation?
				// This could be on an always offline system
			})
			.finally(() => {
				this.#isRefreshingStoreInfo.delete(moduleId)
			})
	}
}

const tmpStoreListData: Record<string, ModuleStoreListCacheEntry> = {
	'bmd-atem': {
		id: 'bmd-atem',
		name: 'Blackmagic: ATEM',
		manufacturer: 'Blackmagic Design',
		products: ['ATEM'],
		keywords: ['blackmagic', 'atem', 'switcher'],

		storeUrl: 'https://bitfocus.io/connections/bmd-atem',
		githubUrl: 'https://github.com/bitfocus/companion-module-bmd-atem',
	},
}
for (let i = 0; i < 20; i++) {
	tmpStoreListData[`test-module-${i}`] = {
		id: `test-module-${i}`,
		name: `Test Module ${i}`,
		manufacturer: 'Test Manufacturer',
		products: ['Test Product'],
		keywords: ['test', 'module'],

		storeUrl: 'https://bitfocus.io/connections/test',
		githubUrl: null,
	}
}
