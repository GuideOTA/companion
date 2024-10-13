import React, { useCallback, useContext, useEffect, useMemo, useState, version } from 'react'
import { ConnectionsContext, LoadingRetryOrError, socketEmitPromise } from '../util.js'
import { CRow, CCol, CButton, CFormSelect, CAlert } from '@coreui/react'
import { TextInputField } from '../Components/index.js'
import { nanoid } from 'nanoid'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faLock,
	faPlug,
	faPlus,
	faQuestion,
	faQuestionCircle,
	faStar,
	faSync,
	faToiletsPortable,
	faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { isLabelValid } from '@companion-app/shared/Label.js'
import { ClientConnectionConfig } from '@companion-app/shared/Model/Common.js'
import { useOptionsAndIsVisible } from '../Hooks/useOptionsAndIsVisible.js'
import { ExtendedInputField } from '@companion-app/shared/Model/Options.js'
import { RootAppStoreContext } from '../Stores/RootAppStore.js'
import { observer } from 'mobx-react-lite'
import type {
	ModuleVersionInfo,
	ModuleVersionMode,
	NewClientModuleInfo,
	NewClientModuleVersionInfo2,
} from '@companion-app/shared/Model/ModuleInfo.js'
import { ModuleStoreModuleInfoStore, ModuleStoreModuleInfoVersion } from '@companion-app/shared/Model/ModulesStore.js'
import { RefreshModuleInfo } from './RefreshModuleInfo.js'
import semver from 'semver'
import { faDochub } from '@fortawesome/free-brands-svg-icons'
import { toJS } from 'mobx'
import { LastUpdatedTimestamp } from './LastUpdatedTimestamp.js'

interface ModuleManagePanelProps {
	moduleId: string
	doManageModule: (moduleId: string | null) => void
	showHelp: (moduleId: string, moduleVersion: NewClientModuleVersionInfo2) => void
}

export const ModuleManagePanel = observer(function ModuleManagePanel({
	moduleId,
	doManageModule,
	showHelp,
}: ModuleManagePanelProps) {
	const { modules } = useContext(RootAppStoreContext)

	const moduleInfo = modules.modules.get(moduleId)

	if (!moduleInfo) {
		return (
			<CRow className="edit-connection">
				<CCol xs={12}>
					<p>Module not found</p>
				</CCol>
			</CRow>
		)
	}

	return (
		<ModuleManagePanelInner
			moduleId={moduleId}
			moduleInfo={moduleInfo}
			doManageModule={doManageModule}
			showHelp={showHelp}
		/>
	)
})

interface ModuleManagePanelInnerProps {
	moduleId: string
	moduleInfo: NewClientModuleInfo
	doManageModule: (moduleId: string | null) => void
	showHelp: (moduleId: string, moduleVersion: NewClientModuleVersionInfo2) => void
}

const ModuleManagePanelInner = observer(function ModuleManagePanelInner({
	moduleId,
	moduleInfo,
	doManageModule,
	showHelp,
}: ModuleManagePanelInnerProps) {
	const { socket } = useContext(RootAppStoreContext)

	const [error, setError] = useState<string | null>(null)
	const [reloadToken, setReloadToken] = useState(nanoid())

	const moduleStoreInfo = useModuleStoreInfo(moduleId)

	const doRetryConfigLoad = useCallback(() => setReloadToken(nanoid()), [])

	/**
	 * Store/builtin Versions table
	 * sorted by version number
	 * Install/uninstall button
	 * plug icon indicating in use (hover for a count)
	 * Icon indicating latest stable
	 * Icon indicating latest prerelease
	 * Indicate prerelease in version number field?
	 * Options to filter to just installed/available
	 *
	 * Above table, show when info last refreshed, and a button to refresh
	 * quick option to install latest?
	 *
	 * filter by installed/available with extra option to show deprecated (default hidden)
	 *
	 * should stable and prerelease be separate?
	 *
	 *
	 * Separate table of 'custom' modules?
	 * I am tempted to combine them, but as numbers can collide will that be confusing?
	 *
	 *
	 */

	return (
		<div>
			<h5>
				Manage {moduleInfo.baseInfo.name}
				{/* {moduleVersion?.hasHelp && (
					<div className="float_right" onClick={() => showHelp(connectionInfo.instance_type, moduleVersion)}>
						<FontAwesomeIcon icon={faQuestionCircle} />
					</div>
				)} */}
			</h5>

			<RefreshModuleInfo moduleId={moduleId} />
			<p>
				<LastUpdatedTimestamp timestamp={moduleStoreInfo?.lastUpdated} />
			</p>

			<ModuleVersionsTable moduleInfo={moduleInfo} moduleStoreInfo={moduleStoreInfo} />
		</div>
	)
})

interface ModuleVersionsTableProps {
	moduleInfo: NewClientModuleInfo
	moduleStoreInfo: ModuleStoreModuleInfoStore | null
}

const ModuleVersionsTable = observer(function ModuleVersionsTable({
	moduleInfo,
	moduleStoreInfo,
}: ModuleVersionsTableProps) {
	const allVersionsSet = new Set<string>()
	const installedModuleVersions = new Map<string, NewClientModuleVersionInfo2>()
	for (const version of moduleInfo.releaseVersions) {
		if (version.version.id) {
			installedModuleVersions.set(version.version.id, version)
			allVersionsSet.add(version.version.id)
		}
	}
	const storeModuleVersions = new Map<string, ModuleStoreModuleInfoVersion>()
	for (const version of moduleStoreInfo?.versions ?? []) {
		storeModuleVersions.set(version.id, version)
		allVersionsSet.add(version.id)
	}

	const allVersionNumbers = Array.from(allVersionsSet).sort((a, b) => semver.compare(b, a))

	console.log(toJS(moduleInfo), moduleStoreInfo)
	return (
		<table className="table-tight table-responsive-sm">
			<thead>
				<tr>
					<th>Version</th>
					<th colSpan={3} className="fit">
						{/* <CButtonGroup style={{ float: 'right', margin: 0 }}>
					<CButton
						size="sm"
						color="secondary"
						style={{
							backgroundColor: 'white',
							opacity: visibleModules.dev ? 1 : 0.4,
							padding: '1px 5px',
							color: 'black',
						}}
						onClick={doToggleDev}
					>
						Dev
					</CButton>
					<CButton
						size="sm"
						color="success"
						style={{ opacity: visibleModules.builtin ? 1 : 0.4, padding: '1px 5px' }}
						onClick={doToggleBuiltin}
					>
						Builtin
					</CButton>
					<CButton
						color="warning"
						size="sm"
						style={{ opacity: visibleModules.store ? 1 : 0.4, padding: '1px 5px' }}
						onClick={doToggleStore}
					>
						Store
					</CButton>
					<CButton
						color="danger"
						size="sm"
						style={{ opacity: visibleModules.custom ? 1 : 0.4, padding: '1px 5px' }}
						onClick={doToggleCustom}
					>
						Custom
					</CButton>
				</CButtonGroup> */}
					</th>
				</tr>
			</thead>
			<tbody>
				{allVersionNumbers.map((versionId) => (
					<ModuleVersionRow
						key={versionId}
						moduleId={moduleInfo.baseInfo.id}
						versionId={versionId}
						storeInfo={storeModuleVersions.get(versionId)}
						installedInfo={installedModuleVersions.get(versionId)}
						isLatestStable={!!moduleInfo.stableVersion && moduleInfo.stableVersion.versionId === versionId}
						isLatestPrerelease={!!moduleInfo.prereleaseVersion && moduleInfo.prereleaseVersion.versionId === versionId}
					/>
				))}
				{/* {hiddenCount > 0 && (
			<tr>
				<td colSpan={4} style={{ padding: '10px 5px' }}>
					<FontAwesomeIcon icon={faEyeSlash} style={{ marginRight: '0.5em', color: 'red' }} />
					<strong>{hiddenCount} Modules are hidden</strong>
				</td>
			</tr>
		)} */}
			</tbody>
		</table>
	)
})

interface ModuleVersionRowProps {
	moduleId: string
	versionId: string
	installedInfo: NewClientModuleVersionInfo2 | undefined
	storeInfo: ModuleStoreModuleInfoVersion | undefined
	isLatestStable: boolean
	isLatestPrerelease: boolean
}

const ModuleVersionRow = observer(function ModuleVersionRow({
	moduleId,
	versionId,
	installedInfo,
	storeInfo,
	isLatestStable,
	isLatestPrerelease,
}: ModuleVersionRowProps) {
	if (!storeInfo && !installedInfo) return null // Should never happen

	return (
		<tr>
			<td>
				{installedInfo ? (
					<ModuleUninstallButton moduleId={moduleId} versionId={versionId} isBuiltin={installedInfo.isBuiltin} />
				) : (
					<ModuleInstallButton moduleId={moduleId} versionId={versionId} />
				)}
			</td>
			<td>{versionId}</td>
			<td>
				{isLatestStable && <FontAwesomeIcon icon={faStar} title="Latest stable" />}
				{isLatestPrerelease && <FontAwesomeIcon icon={faQuestion} title="Latest prerelease" />}

				<ModuleVersionUsageIcon
					moduleId={moduleId}
					moduleVersionId={versionId}
					isLatestStable={isLatestStable}
					isLatestPrerelease={isLatestPrerelease}
				/>
			</td>
		</tr>
	)
})

interface ModuleUninstallButtonProps {
	moduleId: string
	versionId: string
	isBuiltin: boolean
}

function ModuleUninstallButton({ moduleId, versionId, isBuiltin }: ModuleUninstallButtonProps) {
	const { socket } = useContext(RootAppStoreContext)

	const [isRunningInstallOrUninstall, setIsRunningInstallOrUninstall] = useState(false)
	// TODO - track and show error

	const doRemove = useCallback(() => {
		setIsRunningInstallOrUninstall(true)
		socketEmitPromise(socket, 'modules:uninstall-store-module', [moduleId, versionId])
			.catch((err) => {
				console.error('Failed to uninstall module', err)
			})
			.finally(() => {
				setIsRunningInstallOrUninstall(false)
			})
	}, [socket, moduleId, versionId])

	if (isBuiltin) {
		return (
			<CButton color="white" disabled title="Version cannot be removed">
				<FontAwesomeIcon icon={faLock} />
			</CButton>
		)
	}

	return (
		<CButton color="white" disabled={isRunningInstallOrUninstall} onClick={doRemove}>
			{isRunningInstallOrUninstall ? (
				<FontAwesomeIcon icon={faSync} spin title="Removing" />
			) : (
				<FontAwesomeIcon icon={faTrash} title="Remove version" />
			)}
		</CButton>
	)
}

interface ModuleInstallButtonProps {
	moduleId: string
	versionId: string
}

function ModuleInstallButton({ moduleId, versionId }: ModuleInstallButtonProps) {
	const { socket } = useContext(RootAppStoreContext)

	const [isRunningInstallOrUninstall, setIsRunningInstallOrUninstall] = useState(false)
	// TODO - track and show error

	const doInstall = useCallback(() => {
		setIsRunningInstallOrUninstall(true)
		socketEmitPromise(socket, 'modules:install-store-module', [moduleId, versionId])
			.catch((err) => {
				console.error('Failed to install module', err)
			})
			.finally(() => {
				setIsRunningInstallOrUninstall(false)
			})
	}, [socket, moduleId, versionId])

	return (
		<CButton color="white" disabled={isRunningInstallOrUninstall} onClick={doInstall}>
			{isRunningInstallOrUninstall ? (
				<FontAwesomeIcon icon={faSync} spin title="Installing" />
			) : (
				<FontAwesomeIcon icon={faPlus} title="Install version" />
			)}
		</CButton>
	)
}

interface ModuleVersionUsageIconProps {
	moduleId: string
	moduleVersionId: string | null
	isLatestStable: boolean
	isLatestPrerelease: boolean
}

const ModuleVersionUsageIcon = observer(function ModuleVersionUsageIcon({
	moduleId,
	moduleVersionId,
	isLatestStable,
	isLatestPrerelease,
}: ModuleVersionUsageIconProps) {
	const connections = useContext(ConnectionsContext)

	let matchingConnections = 0
	for (const connection of Object.values(connections)) {
		if (connection.instance_type !== moduleId) continue

		if (connection.moduleVersionMode === 'specific-version' && connection.moduleVersionId === moduleVersionId) {
			matchingConnections++
		} else if (connection.moduleVersionMode === 'stable' && isLatestStable) {
			matchingConnections++
		} else if (connection.moduleVersionMode === 'prerelease' && isLatestPrerelease) {
			matchingConnections++
		}
	}

	if (matchingConnections === 0) return null // TODO - needs a placeholder for positioning

	return <FontAwesomeIcon icon={faPlug} title={`${matchingConnections} connections are using this version`} />
})

function useModuleStoreInfo(moduleId: string): ModuleStoreModuleInfoStore | null {
	// TODO - this needs to subscribe, even when this is not visible...

	const { socket } = useContext(RootAppStoreContext)

	const [moduleStoreCache, setModuleStoreCache] = useState<ModuleStoreModuleInfoStore | null>(null)

	useEffect(() => {
		let destroyed = false

		setModuleStoreCache(null)

		const updateCache = (msgModuleId: string, data: ModuleStoreModuleInfoStore) => {
			if (destroyed) return
			if (msgModuleId !== moduleId) return
			setModuleStoreCache(data)
		}

		socketEmitPromise(socket, 'modules-store:info:subscribe', [moduleId])
			.then((data) => {
				if (destroyed) return
				setModuleStoreCache(data)
			})
			.catch((err) => {
				console.error('Failed to subscribe to module store', err)
			})

		socket.on('modules-store:info:data', updateCache)

		return () => {
			destroyed = true
			socket.off('modules-store:info:data', updateCache)

			setModuleStoreCache(null)

			socketEmitPromise(socket, 'modules-store:info:unsubscribe', [moduleId]).catch((err) => {
				console.error('Failed to unsubscribe to module store', err)
			})
		}
	}, [socket, moduleId])

	return moduleStoreCache
}
