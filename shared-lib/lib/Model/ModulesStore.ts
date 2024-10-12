export interface ModuleStoreCacheEntry {
	id: string
	name: string
	manufacturer: string
	products: string[]
	keywords: string[]
	versions: ModuleStoreCacheVersionEntry[]

	storeUrl: string
	githubUrl: string | null

	// description: string | null

	// licenseSPDX: string
	// isPaid

	// Platform support?
	// Has compatible version?

	// TODO - more props
}
export interface ModuleStoreCacheVersionEntry {
	id: string
	isPrerelease: boolean
	releasedAt: number // unix timestamp

	tarUrl: string

	// apiVersion: string // TODO

	// TODO - more props
}

export interface ModuleStoreCacheStore {
	lastUpdated: number
	modules: Record<string, ModuleStoreCacheEntry>
}
