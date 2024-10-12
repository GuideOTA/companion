/** @deprecated */
export interface ModuleStoreCacheVersionEntry {
	id: string
	isPrerelease: boolean
	releasedAt: number // unix timestamp

	tarUrl: string

	// apiVersion: string // TODO

	// TODO - more props
}

export interface ModuleStoreListCacheStore {
	lastUpdated: number
	// lastUpdateAttemp: number
	// updateMessage: string|null
	modules: Record<string, ModuleStoreListCacheEntry>
}

export interface ModuleStoreListCacheEntry {
	id: string
	name: string
	manufacturer: string
	products: string[]
	keywords: string[]

	storeUrl: string
	githubUrl: string | null

	// description: string | null

	// licenseSPDX: string
	// isPaid

	// Platform support?
	// Has compatible version?

	// TODO - more props
}
