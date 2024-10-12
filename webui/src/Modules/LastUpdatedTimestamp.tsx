import React from 'react'

export function LastUpdatedTimestamp({ timestamp }: { timestamp: number | undefined }) {
	let timeStr = 'Unknown'
	if (timestamp === 0) {
		timeStr = 'Never'
	} else if (timestamp !== undefined) {
		const date = new Date(timestamp)
		timeStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
	}

	return <span>Last updated: {timeStr}</span>
}
