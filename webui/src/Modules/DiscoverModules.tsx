import React, { useContext, useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { RootAppStoreContext } from '../Stores/RootAppStore.js'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons'
import { NewClientModuleInfo } from '@companion-app/shared/Model/ModuleInfo.js'
import { socketEmitPromise } from '../util.js'
import { CButton } from '@coreui/react'
import { NonIdealState } from '../Components/NonIdealState.js'
import { ModuleStoreCacheEntry, ModuleStoreCacheStore } from '@companion-app/shared/Model/ModulesStore.js'
import { RefreshModulesList } from '../Modules2/RefreshModulesList.js'

export const DiscoverVersions = observer(function InstalledModules() {
	const { modules } = useContext(RootAppStoreContext)

	const moduleStoreCache = useModuleStoreList()

	const moduleInfos = Object.values(moduleStoreCache?.modules || {})

	return (
		<>
			<RefreshModulesList />

			<div>
				<p>
					Last updated:{' '}
					{moduleStoreCache ? (moduleStoreCache.lastUpdated === 0 ? 'Never' : moduleStoreCache.lastUpdated) : 'Unknown'}
				</p>
			</div>

			<div className="module-manager-list2">
				{moduleInfos.length === 0 && (
					<NonIdealState icon={faQuestionCircle}>
						Click the refresh button to fetch the list of modules.
						<br /> This requires internet access to retrieve
					</NonIdealState>
				)}

				{moduleInfos.map((moduleInfo) => (
					<ModuleEntry
						key={moduleInfo.id}
						moduleInfo={moduleInfo}
						installedModuleInfo={modules.modules.get(moduleInfo.id)}
					/>
				))}
			</div>
		</>
	)
})

interface ModuleEntryProps {
	moduleInfo: ModuleStoreCacheEntry
	installedModuleInfo: NewClientModuleInfo | undefined
}

const ModuleEntry = observer(function ModuleEntry({ moduleInfo, installedModuleInfo }: ModuleEntryProps) {
	const { socket } = useContext(RootAppStoreContext)

	const installedVersions = new Set<string>()
	if (installedModuleInfo) {
		for (const version of installedModuleInfo.releaseVersions) {
			if (version.version.id) installedVersions.add(version.version.id)
		}
	}

	return (
		<>
			<p>
				{moduleInfo.name} ({moduleInfo.id}) {installedModuleInfo ? 'Installed' : 'Not installed'}
			</p>

			{moduleInfo.versions.map((v) => {
				const isInstalled = installedVersions.has(v.id)
				return (
					<p key={v.id}>
						{v.id} - {v.isPrerelease ? 'prerelease' : 'stable'} {new Date(v.releasedAt).toISOString()}
						<CButton
							color="primary"
							disabled={isInstalled}
							title={isInstalled ? 'Already installed' : ''}
							onClick={() => {
								socketEmitPromise(socket, 'modules:install-store-module', [moduleInfo.id, v.id]).catch((err) => {
									console.error('Failed to install module', err)
								})
							}}
						>
							Install
						</CButton>
					</p>
				)
			})}
			<hr />
		</>
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
