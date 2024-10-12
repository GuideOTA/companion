import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ConnectionsContext, LoadingRetryOrError, socketEmitPromise } from '../util.js'
import { CRow, CCol, CButton, CFormSelect, CAlert } from '@coreui/react'
import { TextInputField } from '../Components/index.js'
import { nanoid } from 'nanoid'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons'
import { isLabelValid } from '@companion-app/shared/Label.js'
import { ClientConnectionConfig } from '@companion-app/shared/Model/Common.js'
import { useOptionsAndIsVisible } from '../Hooks/useOptionsAndIsVisible.js'
import { ExtendedInputField } from '@companion-app/shared/Model/Options.js'
import { RootAppStoreContext } from '../Stores/RootAppStore.js'
import { observer } from 'mobx-react-lite'
import type {
	ModuleVersionInfo,
	NewClientModuleInfo,
	NewClientModuleVersionInfo2,
} from '@companion-app/shared/Model/ModuleInfo.js'

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

	// useEffect(() => {
	// 	if (connectionId) {
	// 		socketEmitPromise(socket, 'connections:edit', [connectionId])
	// 			.then((res) => {
	// 				if (res) {
	// 					if (res.fields) {
	// 						const validFields: Record<string, boolean> = {}
	// 						for (const field of res.fields) {
	// 							// Real validation status gets generated when the editor components first mount
	// 							validFields[field.id] = true
	// 						}

	// 						setConfigFields(res.fields)
	// 						setValidFields(validFields)
	// 					} else {
	// 						setConfigFields(null)
	// 						setValidFields(null)
	// 					}

	// 					setConnectionConfig(res.config as any)
	// 				} else {
	// 					setError(`Connection config unavailable`)
	// 				}
	// 			})
	// 			.catch((e) => {
	// 				setError(`Failed to load connection info: "${e}"`)
	// 			})
	// 	}

	// 	return () => {
	// 		setError(null)
	// 		setConfigFields(null)
	// 		setConnectionConfig(null)
	// 		setValidFields(null)
	// 	}
	// }, [socket, connectionId, reloadToken])

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
	 * when installing version, change button to spinner?
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

			<h6>Versions:</h6>
			{/* <CRow className="edit-connection">
				<CCol className={`fieldtype-textinput`} sm={12}>
					<label>Label</label>
					<TextInputField
						value={connectionLabel ?? ''}
						setValue={setConnectionLabel}
						// isValid={isLabelValid(connectionLabel)}
					/>
				</CCol>

				<CCol className={`fieldtype-textinput`} sm={12}>
					<label>Module Version</label>
					<CFormSelect
						name="colFormVersion"
						value={JSON.stringify(connectionVersion)}
						onChange={(e) => setConnectionVersion(JSON.parse(e.currentTarget.value))}
						disabled={connectionInfo.enabled}
						title={
							connectionInfo.enabled
								? 'Connection must be disabled to change version'
								: 'Select the version of the module to use for this connection'
						}
					>
						{getConnectionVersionSelectOptions(moduleInfo).map((v) => (
							<option key={v.value} value={v.value}>
								{v.label}
							</option>
						))}
					</CFormSelect>

					<br />
					<CAlert color="warning">
						Be careful when downgrading the module version. Some features may not be available in older versions.
					</CAlert>
				</CCol>

			
			</CRow> */}
		</div>
	)
})
