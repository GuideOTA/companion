import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { RootAppStoreContext } from '../Stores/RootAppStore.js'
import { faExternalLink, faQuestionCircle } from '@fortawesome/free-solid-svg-icons'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { socketEmitPromise } from '../util.js'
import { CAlert, CButton } from '@coreui/react'
import { NonIdealState } from '../Components/NonIdealState.js'
import { ModuleStoreCacheEntry, ModuleStoreCacheStore } from '@companion-app/shared/Model/ModulesStore.js'
import { RefreshModulesList } from './RefreshModulesList.js'
import { SearchBox } from '../Components/SearchBox.js'
import { go as fuzzySearch } from 'fuzzysort'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { WindowLinkOpen } from '../Helpers/Window.js'

interface DiscoverModulesPanelProps {
	doManageModule: (moduleId: string) => void
}

export const DiscoverModulesPanel = observer(function DiscoverModulesPanel({
	doManageModule,
}: DiscoverModulesPanelProps) {
	const { socket } = useContext(RootAppStoreContext)

	const moduleStoreCache = useModuleStoreList()

	const doInstallLatestModule = useCallback((moduleId: string) => {
		socketEmitPromise(socket, 'modules:install-store-module:latest', [moduleId]).catch((err) => {
			console.error('Failed to install module', err)
		})
	}, [])

	const [filter, setFilter] = useState('')

	let candidates: JSX.Element[] = []
	try {
		const searchResults = useFilteredStoreProducts(moduleStoreCache, filter)

		const candidatesObj: Record<string, JSX.Element> = {}
		for (const moduleInfo of searchResults) {
			candidatesObj[moduleInfo.id] = (
				<StoreModuleEntry
					key={moduleInfo.id}
					moduleInfo={moduleInfo}
					doManageModule={doManageModule}
					doInstallLatestModule={doInstallLatestModule}
				/>
			)
		}

		if (!filter) {
			candidates = Object.entries(candidatesObj)
				.sort((a, b) => {
					const aName = a[0].toLocaleLowerCase()
					const bName = b[0].toLocaleLowerCase()
					if (aName < bName) return -1
					if (aName > bName) return 1
					return 0
				})
				.map((c) => c[1])
		} else {
			candidates = Object.entries(candidatesObj).map((c) => c[1])
		}
	} catch (e) {
		console.error('Failed to compile candidates list:', e)

		candidates = []
		candidates.push(
			<CAlert color="warning" role="alert">
				Failed to build list of modules:
				<br />
				{e?.toString()}
			</CAlert>
		)
	}

	const storeModuleCount = Object.values(moduleStoreCache?.modules || {}).length

	return (
		<>
			<div style={{ clear: 'both' }} className="row-heading">
				<h4>Discover modules</h4>
				<p>
					If you have an active internet connection, you can search for and install modules to support additional
					devices. If you can't find the device you're looking for, please{' '}
					<a target="_new" href="https://github.com/bitfocus/companion-module-requests">
						add a request
					</a>{' '}
					on GitHub
				</p>

				<RefreshModulesList />
				<p>
					Last updated:&nbsp;
					{moduleStoreCache
						? moduleStoreCache.lastUpdated === 0
							? 'Never'
							: new Date(moduleStoreCache.lastUpdated).toISOString()
						: 'Unknown'}
				</p>

				<SearchBox filter={filter} setFilter={setFilter} />
				<br />
			</div>

			<div className="module-manager-list2">
				{storeModuleCount === 0 && (
					<NonIdealState icon={faQuestionCircle}>
						Click the refresh button to fetch the list of modules.
						<br /> This requires internet access to retrieve
					</NonIdealState>
				)}

				{candidates}
			</div>
		</>
	)
})

interface StoreModuleEntryProps {
	moduleInfo: ModuleStoreCacheEntry
	doManageModule: (moduleId: string) => void
	doInstallLatestModule: (moduleId: string) => void
}

const StoreModuleEntry = observer(function StoreModuleEntry({
	moduleInfo,
	doManageModule,
	doInstallLatestModule,
}: StoreModuleEntryProps) {
	const { modules } = useContext(RootAppStoreContext)

	const moduleIsInstalled = modules.modules.has(moduleInfo.id)

	const installLatestModuleClick = useCallback(
		() => doInstallLatestModule(moduleInfo.id),
		[doInstallLatestModule, moduleInfo.id]
	)
	const manageModuleClick = useCallback(() => doManageModule(moduleInfo.id), [doManageModule, moduleInfo.id])

	return (
		<div>
			{moduleIsInstalled ? (
				<CButton color="primary" onClick={manageModuleClick}>
					Manage Versions
				</CButton>
			) : (
				<CButton color="primary" onClick={installLatestModuleClick}>
					Install Latest
				</CButton>
			)}
			&nbsp;
			{/* {moduleInfo.stableVersion?.isLegacy && (
				<>
					<FontAwesomeIcon
						icon={faExclamationTriangle}
						color="#ff6600"
						size={'xl'}
						title="This module has not been updated for Companion 3.0, and may not work fully"
					/>
					&nbsp;
				</>
			)} */}
			{moduleInfo.name}
			{/* {showVersion?.hasHelp && (
				<div className="float_right" onClick={showHelpClick}>
					<FontAwesomeIcon icon={faQuestionCircle} />
				</div>
			)} */}
			<WindowLinkOpen className="float_right" title="Open Store Page" href={moduleInfo.storeUrl}>
				<FontAwesomeIcon icon={faExternalLink} />
			</WindowLinkOpen>
			{!!moduleInfo.githubUrl && (
				<WindowLinkOpen className="float_right" title="Open Store Page" href={moduleInfo.githubUrl}>
					<FontAwesomeIcon icon={faGithub} />
				</WindowLinkOpen>
			)}
		</div>
	)
})

function useModuleStoreList(): ModuleStoreCacheStore | null {
	// TODO - this needs to subscribe, even when this is not visible...

	const { socket } = useContext(RootAppStoreContext)

	const [moduleStoreCache, setModuleStoreCache] = useState<ModuleStoreCacheStore | null>(null)

	useEffect(() => {
		let destroyed = false

		const updateCache = (data: ModuleStoreCacheStore) => {
			if (destroyed) return
			setModuleStoreCache(data)
		}

		socketEmitPromise(socket, 'modules-store:subscribe', [])
			.then(updateCache)
			.catch((err) => {
				console.error('Failed to subscribe to module store', err)
			})

		socket.on('modules-store:data', updateCache)

		return () => {
			destroyed = true
			socket.off('modules-store:data', updateCache)

			socketEmitPromise(socket, 'modules-store:unsubscribe', []).catch((err) => {
				console.error('Failed to unsubscribe to module store', err)
			})
		}
	}, [socket])

	return moduleStoreCache
}

function useFilteredStoreProducts(
	moduleStoreCache: ModuleStoreCacheStore | null,
	filter: string
): ModuleStoreCacheEntry[] {
	const allProducts: ModuleStoreCacheEntry[] = useMemo(
		() =>
			Object.values(moduleStoreCache?.modules ?? {}).flatMap((moduleInfo) =>
				moduleInfo.products.map((product) => ({
					product,
					...moduleInfo,
					// fuzzySearch can't handle arrays, so flatten the array to a string first
					keywordsStr: moduleInfo.keywords?.join(';') ?? '',
				}))
			),
		[moduleStoreCache?.modules]
	)

	if (!filter) return allProducts

	// TODO - this is giving low quality results now, need to improve
	return fuzzySearch(filter, allProducts, {
		keys: ['product', 'name', 'manufacturer', 'keywordsStr'],
		threshold: -10_000,
	}).map((x) => x.obj)
}