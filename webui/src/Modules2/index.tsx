import { CCol, CRow, CTabContent, CTabPane, CNavItem, CNavLink, CNav } from '@coreui/react'
import React, { memo, useCallback, useRef, useState } from 'react'
import { HelpModal, HelpModalRef } from '../Connections/HelpModal.js'
import { MyErrorBoundary } from '../util.js'
import { ModulesList } from './ModulesList.js'
// import { AddConnectionsPanel } from './AddConnection.js'
// import { ConnectionEditPanel } from './ConnectionEditPanel.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { nanoid } from 'nanoid'
import { faCog, faPlus } from '@fortawesome/free-solid-svg-icons'
import classNames from 'classnames'
import { NewClientModuleVersionInfo2 } from '@companion-app/shared/Model/ModuleInfo.js'
import { DiscoverModulesPanel } from './DiscoverModulesPanel.js'
import { ModuleManagePanel } from './ModuleManagePanel.js'

export const ModulesPage = memo(function ConnectionsPage() {
	const helpModalRef = useRef<HelpModalRef>(null)

	const [tabResetToken, setTabResetToken] = useState(nanoid())
	const [activeTab, setActiveTab] = useState<'discover' | 'manage'>('discover')
	const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
	const doChangeTab = useCallback((newTab: 'discover' | 'manage') => {
		setActiveTab((oldTab) => {
			if (oldTab !== newTab) {
				setSelectedModuleId(null)
				setTabResetToken(nanoid())
			}
			return newTab
		})
	}, [])

	const showHelp = useCallback(
		(id: string, moduleVersion: NewClientModuleVersionInfo2) => helpModalRef.current?.show(id, moduleVersion),
		[]
	)

	const doManageModule = useCallback((moduleId: string | null) => {
		setSelectedModuleId(moduleId)
		setTabResetToken(nanoid())
		setActiveTab(moduleId ? 'manage' : 'discover')
	}, [])

	return (
		<CRow className="connections-page split-panels">
			<HelpModal ref={helpModalRef} />

			<CCol xl={6} className="connections-panel primary-panel">
				<ModulesList showHelp={showHelp} doManageModule={doManageModule} selectedModuleId={selectedModuleId} />
			</CCol>

			<CCol xl={6} className="connections-panel secondary-panel add-connections-panel">
				<div className="secondary-panel-inner">
					<CNav variant="tabs">
						<CNavItem>
							<CNavLink active={activeTab === 'discover'} onClick={() => doChangeTab('discover')}>
								<FontAwesomeIcon icon={faPlus} /> Discover modules
							</CNavLink>
						</CNavItem>
						<CNavItem
							className={classNames({
								hidden: !selectedModuleId,
							})}
						>
							<CNavLink active={activeTab === 'manage'} onClick={() => doChangeTab('manage')}>
								<FontAwesomeIcon icon={faCog} /> Manage Module
							</CNavLink>
						</CNavItem>
					</CNav>
					<CTabContent className="remove075right">
						<CTabPane role="tabpanel" aria-labelledby="discover-tab" visible={activeTab === 'discover'}>
							<MyErrorBoundary>
								<DiscoverModulesPanel doManageModule={doManageModule} />
							</MyErrorBoundary>
						</CTabPane>
						<CTabPane role="tabpanel" aria-labelledby="manage-tab" visible={activeTab === 'manage'}>
							<MyErrorBoundary>
								{selectedModuleId && (
									<ModuleManagePanel
										key={tabResetToken}
										showHelp={showHelp}
										doManageModule={doManageModule}
										moduleId={selectedModuleId}
									/>
								)}
							</MyErrorBoundary>
						</CTabPane>
					</CTabContent>
				</div>
			</CCol>
		</CRow>
	)
})
