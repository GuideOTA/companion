import React, { useContext, useState, useCallback, useRef } from 'react'
import { CAlert, CButton } from '@coreui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle, faQuestionCircle } from '@fortawesome/free-solid-svg-icons'
import { RootAppStoreContext } from '../Stores/RootAppStore.js'
import { observer } from 'mobx-react-lite'
import { SearchBox } from '../Components/SearchBox.js'
import { ModuleProductInfo, useFilteredProducts } from '../Hooks/useFilteredProducts.js'
import { NewClientModuleVersionInfo2 } from '@companion-app/shared/Model/ModuleInfo.js'
import { AddConnectionModal, AddConnectionModalRef } from './AddConnectionModal.js'

interface AddConnectionsPanelProps {
	showHelp: (moduleId: string, moduleVersion: NewClientModuleVersionInfo2) => void
	doConfigureConnection: (connectionId: string) => void
}

export const AddConnectionsPanel = observer(function AddConnectionsPanel({
	showHelp,
	doConfigureConnection,
}: AddConnectionsPanelProps) {
	const { modules } = useContext(RootAppStoreContext)
	const [filter, setFilter] = useState('')

	const addRef = useRef<AddConnectionModalRef>(null)
	const addConnection = useCallback((module: ModuleProductInfo) => {
		addRef.current?.show(module)
	}, [])

	let candidates: JSX.Element[] = []
	try {
		const searchResults = useFilteredProducts(filter)

		const candidatesObj: Record<string, JSX.Element> = {}
		for (const module of searchResults) {
			candidatesObj[module.baseInfo.name] = (
				<AddConnectionEntry
					key={module.baseInfo.name}
					module={module}
					addConnection={addConnection}
					showHelp={showHelp}
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

	return (
		<>
			<AddConnectionModal ref={addRef} doConfigureConnection={doConfigureConnection} showHelp={showHelp} />
			<div style={{ clear: 'both' }} className="row-heading">
				<h4>Add connection</h4>
				<p>
					Companion currently supports {modules.count} different things, and the list grows every day. If you can't find
					the device you're looking for, please{' '}
					<a target="_new" href="https://github.com/bitfocus/companion-module-requests">
						add a request
					</a>{' '}
					on GitHub
				</p>

				<SearchBox filter={filter} setFilter={setFilter} />
				<br />
			</div>
			<div id="connection_add_search_results">{candidates}</div>
		</>
	)
})

interface AddConnectionEntryProps {
	module: ModuleProductInfo
	addConnection(module: ModuleProductInfo): void
	showHelp(moduleId: string, moduleVersion: NewClientModuleVersionInfo2): void
}

function AddConnectionEntry({ module, addConnection, showHelp }: AddConnectionEntryProps) {
	const addConnectionClick = useCallback(() => addConnection(module), [addConnection, module])
	const showVersion: NewClientModuleVersionInfo2 | undefined =
		module.stableVersion ?? module.prereleaseVersion ?? module.releaseVersions[0]
	const showHelpClick = useCallback(
		() => showVersion && showHelp(module.baseInfo.id, showVersion),
		[showHelp, module.baseInfo.id, showVersion]
	)

	return (
		<div>
			<CButton color="primary" onClick={addConnectionClick}>
				Add
			</CButton>
			&nbsp;
			{module.stableVersion?.isLegacy && (
				<>
					<FontAwesomeIcon
						icon={faExclamationTriangle}
						color="#ff6600"
						size={'xl'}
						title="This module has not been updated for Companion 3.0, and may not work fully"
					/>
					&nbsp;
				</>
			)}
			{module.baseInfo.name}
			{showVersion?.hasHelp && (
				<div className="float_right" onClick={showHelpClick}>
					<FontAwesomeIcon icon={faQuestionCircle} />
				</div>
			)}
		</div>
	)
}
