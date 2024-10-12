import { useCallback, useContext, useEffect, useState } from 'react'
import { RootAppStoreContext } from '../Stores/RootAppStore.js'
import React from 'react'
import { CAlert, CButton } from '@coreui/react'
import { faSync } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { socketEmitPromise } from '../util.js'

interface RefreshModulesListProps {
	moduleId: string
}

export function RefreshModuleInfo({ moduleId }: RefreshModulesListProps) {
	const { socket } = useContext(RootAppStoreContext)

	const refreshProgress = useRefreshProgress(moduleId)
	const [refreshError, setLoadError] = useState<string | null>(null) // TODO - show this error

	const doRefreshModules = useCallback(() => {
		socketEmitPromise(socket, 'modules-store:info:refresh', [moduleId]).catch((err) => {
			console.error('Failed to refresh module info', err)
		})
	}, [socket])

	return (
		<div>
			{refreshError ? <CAlert color="warning">{refreshError}</CAlert> : ''}

			{refreshProgress !== 1 ? (
				<CButton color="primary" disabled>
					<FontAwesomeIcon icon={faSync} spin={true} />
					&nbsp;Refreshing module info {Math.round(refreshProgress * 100)}%
				</CButton>
			) : (
				<CButton color="primary" onClick={doRefreshModules}>
					<FontAwesomeIcon icon={faSync} />
					&nbsp;Refresh module info
				</CButton>
			)}
		</div>
	)
}

function useRefreshProgress(moduleId: string): number {
	// TODO - this needs to subscribe, even when this is not visible...

	const { socket } = useContext(RootAppStoreContext)

	const [refreshProgress, setRefreshProgress] = useState(1) // Assume fully loaded

	useEffect(() => {
		setRefreshProgress(1)

		const handler = (msgModuleId: string, progress: number) => {
			if (msgModuleId !== moduleId) return
			setRefreshProgress(progress)
		}

		socket.on('modules-store:info:progress', handler)

		return () => {
			socket.off('modules-store:info:progress', handler)

			setRefreshProgress(1)
		}
	}, [socket, moduleId])

	return refreshProgress
}
