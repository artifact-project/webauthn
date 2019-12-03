import { log, getLogEntries, verbose } from './logger';
import { encodeAttestationResponsePayload, encodeAssertionResponsePlayload } from './utils';
export { getLogEntries };

export const REQUEST_PID_KEY = '__webauthn:request:pid__';
export const RESPONSE_PID_KEY = '__webauthn:response:pid__';
export const FORWARDING_KEY = '__webauthn:forwarding:flag__';

export const globalThis = Function('return this')() as Window;
export const selfOrigin = globalThis.location && globalThis.location.origin || '';

const FORWARDING_SOURCE = {} as {[key:string]: Window}

export interface RevokeAllow { (): void; }

export function allowFrom(originPatterns: string[]): RevokeAllow {
	const origins = convertOriginPatterns(originPatterns);

	function handleMessage({data, origin, source}: MessageEvent) {
		if (!data) {
			// Skip empty data
			return;
		}

		const method = data.method;
		const send = (packed: object) => {
			const logMsg = `credentials.${method}(...) send response`;

			packed[FORWARDING_KEY] = data[FORWARDING_KEY];
			packed[RESPONSE_PID_KEY] = data[REQUEST_PID_KEY];

			try {
				verbose(logMsg, {packed, origin});
				(source as Window).postMessage(packed, origin);
			} catch (error) {
				log(`${logMsg} failed`, {error, packed, origin});
			}
		};

		if (data[FORWARDING_KEY] && data[RESPONSE_PID_KEY]) {
			try {
				verbose('forwarding response from parent', {origin, data});
				FORWARDING_SOURCE[data[RESPONSE_PID_KEY]].postMessage(data, '*');
				delete FORWARDING_SOURCE[data[RESPONSE_PID_KEY]];
			} catch (error) {
				log('forwarding response from parent failed', {origin, data, error});
			}
			return;
		}

		if (!data[REQUEST_PID_KEY]) {
			verbose('skip post message data, because is not invoke request', {origin, data});
			return;
		}

		if (!isTrustedOrigin(origins, origin)) {
			verbose('invoke credentials origin failed', {origin, data});
			return;
		}

		if (method) {
			const logMsg = `invoke credentials.${method}(...)`;

			// Forwarding the event to up
			if (parent !== globalThis) {
				verbose(`forwarding ${logMsg}`, {origin, data});
				data[FORWARDING_KEY] = true;
				FORWARDING_SOURCE[data[REQUEST_PID_KEY]] = source as Window;
				parent.postMessage(data, '*');
				return;
			}

			try {
				verbose(logMsg, {origin, data});
				globalThis.navigator.credentials[method](data.options)
					.then((credential: any) => {
						send({
							response: method === 'create'
								? encodeAttestationResponsePayload(credential)
								: encodeAssertionResponsePlayload(credential)
						});
					})
					.catch((reason: any) => {
						send({failed: reason, data});
					})
				;
			} catch (error) {
				log(`${logMsg} failed`, {origin, data, error});
			}
			return;
		}

		verbose('unknown invoke credentials', {origin, data});
	}

	log('allow from', {origins: originPatterns});
	globalThis.addEventListener('message', handleMessage);
	return () => {
		log('revoke allow from', {origins: originPatterns});
		globalThis.removeEventListener('message', handleMessage);
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
