import { useComputed } from '../util.js'
import { go as fuzzySearch } from 'fuzzysort'
import { NewClientModuleInfo } from '@companion-app/shared/Model/ModuleInfo.js'
import { useContext } from 'react'
import { RootAppStoreContext } from '../Stores/RootAppStore.js'

export interface ModuleProductInfo extends NewClientModuleInfo {
	product: string
}

export function useFilteredProducts(filter: string): ModuleProductInfo[] {
	const { modules } = useContext(RootAppStoreContext)

	const allProducts: ModuleProductInfo[] = useComputed(
		() =>
			Array.from(modules.modules.values()).flatMap((module) =>
				module.baseInfo.products.map((product) => ({
					product,
					...module,
					// fuzzySearch can't handle arrays, so flatten the array to a string first
					keywords: module.baseInfo.keywords?.join(';') ?? '',
				}))
			),
		[modules]
	)

	if (!filter) return allProducts

	// TODO - this is giving low quality results now, need to improve
	return fuzzySearch(filter, allProducts, {
		keys: ['product', 'name', 'manufacturer', 'keywords'],
		threshold: -10_000,
	}).map((x) => x.obj)
}