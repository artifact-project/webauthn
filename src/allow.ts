import { log, getLogEntries, verbose } from './logger';
export { getLogEntries };

export const REQUEST_PID_KEY = '__webauthn:request:pid__';
export const RESPONSE_PID_KEY = '__webauthn:response:pid__';
export const globalThis = Function('return this')() as Window;
export const selfOrigin = globalThis.location && globalThis.location.origin || '';

export interface RevokeAllow { (): void; }

export type CredentialsAPI = {
	create: {
		options: CredentialCreationOptions
		return: Credential | null;
	};

	get: {
		options: CredentialRequestOptions
		return: CredentialType | null;
	};
}

export function allowFrom(originPatterns: string[]): RevokeAllow {
	const origins = convertOriginPatterns(originPatterns);

	function handleMessage({data, origin, source}: MessageEvent) {
		function send(extra: object) {
			const packed = {
				[RESPONSE_PID_KEY]: data[REQUEST_PID_KEY],
				...extra,
			};
			const logMsg = `credentials.${data.method}(...) send response`;

			try {
				verbose(logMsg, {packed, origin});
				(source as Window).postMessage(packed, origin);
			} catch (error) {
				log(`${logMsg} failed`, {error, packed, origin});
			}
		}

		if (!data || !data[REQUEST_PID_KEY]) {
			verbose('remote skipped post message data', {origin, data});
			return;
		}

		if (!isTrustedOrigin(origins, origin)) {
			verbose('invoke credentials origin failed', {origin, data});
			return;
		}

		if (data.method) {
			try {
				verbose(`invoke credentials.${data.method}(...)`, {origin, data});
				globalThis.navigator.credentials[data.method](data.options)
					.then((credential: object) => { send({response: credential}); })
					.catch((reason: any) => { send({failed: reason}); })
				;
			} catch (error) {
				log(`invoke credentials.${data.method}(...) failed`, {origin, data, error});
			}
			return;
		}

		verbose('unknown invoke credentials', {origin, data});
	}

	log('allow from', {origins: originPatterns});
	window.addEventListener('message', handleMessage);
	return () => {
		log('revoke allow from', {origins: originPatterns});
		window.removeEventListener('message', handleMessage);
	};
}

export function convertOriginPatterns(patterns: string[]): RegExp[] {
	return patterns.map((pattern) => new RegExp(
		`^${addScheme(pattern)
			.replace(/[\/\\^$+?.()|[\]{}]/g, '\\$&')
			.replace(/\*/g, '[a-z0-9-]+')
			.replace(/\\\{([a-z0-9,]+)\\\}/g, (_, val) => `(${val.split(',').join('|')})`)
		}$`,
		`i`,
	));
}

function addScheme(origin: string) {
	return /^https?:\/\//.test(origin) ? origin : `https://${origin}`;
}

export function isTrustedOrigin(origins: RegExp[], origin: string): boolean {
	return origins.some(re => re.test(origin));
}
