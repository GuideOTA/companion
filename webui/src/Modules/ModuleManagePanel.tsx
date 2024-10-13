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
	faWarning,
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
import { isModuleApiVersionCompatible } from '@companion-app/shared/ModuleApiVersionCheck.js'
import { ModuleVersionsTable } from './ModuleVersionsTable.js'
import { CustomModuleVersionsTable } from './CustomModuleVersionsTable.js'

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
	 *   also option to show prerelease (default hidden)
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

			<h6>Versions</h6>
			<ModuleVersionsTable moduleInfo={moduleInfo} moduleStoreInfo={moduleStoreInfo} />

			<h6>Custom Versions</h6>
			<CustomModuleVersionsTable moduleInfo={moduleInfo} />
		</div>
	)
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
