import React, { useCallback, useContext, useState } from 'react'
import { socketEmitPromise } from '../util.js'
import { CButton } from '@coreui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faLock,
	faPlus,
	faQuestion,
	faStar,
	faSync,
	faToiletsPortable,
	faTrash,
	faWarning,
} from '@fortawesome/free-solid-svg-icons'
import { RootAppStoreContext } from '../Stores/RootAppStore.js'
import { observer } from 'mobx-react-lite'
import type { NewClientModuleInfo, NewClientModuleVersionInfo2 } from '@companion-app/shared/Model/ModuleInfo.js'
import { ModuleStoreModuleInfoStore, ModuleStoreModuleInfoVersion } from '@companion-app/shared/Model/ModulesStore.js'
import semver from 'semver'
import { isModuleApiVersionCompatible } from '@companion-app/shared/ModuleApiVersionCheck.js'
import { ModuleVersionUsageIcon } from './ModuleVersionUsageIcon.js'

interface ModuleVersionsTableProps {
	moduleInfo: NewClientModuleInfo
	moduleStoreInfo: ModuleStoreModuleInfoStore | null
}

export const ModuleVersionsTable = observer(function ModuleVersionsTable({
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
					<ModuleInstallButton
						moduleId={moduleId}
						versionId={versionId}
						apiVersion={storeInfo!.apiVersion}
						hasTarUrl={!!storeInfo?.tarUrl}
					/>
				)}
			</td>
			<td>
				{versionId}
				{storeInfo?.deprecationReason && <FontAwesomeIcon icon={faWarning} title="Deprecated" />}
			</td>
			<td>{storeInfo?.releasedAt ? new Date(storeInfo?.releasedAt).toDateString() : 'Unknown'}</td>
			<td>
				{isLatestStable && <FontAwesomeIcon icon={faStar} title="Latest stable" />}
				{isLatestPrerelease && <FontAwesomeIcon icon={faQuestion} title="Latest prerelease" />}

				<ModuleVersionUsageIcon
					moduleId={moduleId}
					moduleVersionMode="specific-version"
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
		return <FontAwesomeIcon className="disabled" icon={faLock} title="Version cannot be removed" />
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
	apiVersion: string
	hasTarUrl: boolean
}

function ModuleInstallButton({ moduleId, versionId, apiVersion, hasTarUrl }: ModuleInstallButtonProps) {
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

	if (!hasTarUrl) {
		return <FontAwesomeIcon icon={faToiletsPortable} className="disabled" title="Module is no longer available" />
	}

	if (!isModuleApiVersionCompatible(apiVersion)) {
		return (
			<FontAwesomeIcon
				icon={faWarning}
				className="disabled"
				title="Module is not compatible with this version of Companion"
			/>
		)
	}

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
