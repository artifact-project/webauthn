const entries = [] as Array<{msg: string; detail: any}>

export function log(msg: string | Error, detail: any = null) {
	if (process.env.NODE_ENV !== 'production') {
		if (process.env.verbose) {
			console.log(msg, detail);
		}
	}

	entries.push({msg: `${msg}`, detail});
}

export function verbose(msg: string | Error, detail: any = null) {
	if (process.env.NODE_ENV !== 'production') {
		if (process.env.verbose) {
			console.log(`[verbose] ${msg}`, detail);
		}
	}
}

export function getLogEntries() {
	return entries;
}