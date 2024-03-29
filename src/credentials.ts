import { log, verbose } from './logger';
import {
	globalThis,
	isTrustedOrigin,
	convertOriginPatterns,

	REQUEST_PID_KEY,
	RESPONSE_PID_KEY,
} from './allow';
import { decodeAttestationResponsePayload, decodeAssertionResponsePlayload } from './utils';

let cid = 0;

export function isCredentialsSupported() {
	const nav = globalThis.navigator || null;
	const nativeCredentials = nav && nav.credentials || null;
	return !!(
		typeof globalThis['PublicKeyCredential'] === 'function'
		&& nativeCredentials
		&& nativeCredentials.create
		&& nativeCredentials.get
	);
}

const allowForOrigins = [] as RegExp[];

export function allowFor(originPatterns: string[]): void {
	allowForOrigins.push(...convertOriginPatterns(originPatterns));
}

export function allowedFor(origin: string) {
	return isTrustedOrigin(allowForOrigins, origin);
}

export const credentials = {
	create(options?: CredentialCreationOptions): Promise<Credential | null> {
		return invokeCredentials('create', options);
	},

	get(options?: CredentialRequestOptions): Promise<Credential | null> {
		return invokeCredentials('get', options);
	},
};

type InvokeCredentialsMethod = {
	create: CredentialCreationOptions;
	get: CredentialRequestOptions;
}

function invokeCredentials<
	M extends keyof InvokeCredentialsMethod,
>(
	method: M,
	options?: InvokeCredentialsMethod[M],
): Promise<Credential | null> {
	return new Promise((resolve, reject) => {
		if (!isCredentialsSupported()) {
			const err = new Error(`credentials.${method}(...) not supported`);
			log(err.message, options);
			reject(err);
			return;
		}

		const pid = `${Date.now()}:${Math.random()}:${++cid}`;
		const handleMessage = ({data, origin}: MessageEvent) => {
			try {
				if (!data || data[RESPONSE_PID_KEY] !== pid) {
					return;
				}

				if (!allowedFor(origin)) {
					log('remote response ignored, origin not allowed', {origin, method, data});
					return;
				}

				if ('failed' in data) {
					verbose('response failed', {reason: data.failed, method, data});
					reject(data.failed);
					return;
				}

				if ('response' in data) {
					verbose('response received', {response: data.response, method, data});
					resolve(method === 'create'
						? decodeAttestationResponsePayload(data.response)
						: decodeAssertionResponsePlayload(data.response)
					);
					return;
				}

				log('unknown response', {method, data});
			} catch (error) {
				log('response processing failed', {error, method, data});
			}
		};

		globalThis.addEventListener('message', handleMessage);

		const packet = {
			[REQUEST_PID_KEY]: pid,
			method,
			options,
		};
		try {
			verbose('invoke remote credentials', {packet});
			parent.postMessage(packet, '*');
		} catch (error) {
			log('response processing failed', {error, packet});
		}

		setTimeout(() => {
			globalThis.removeEventListener('message', handleMessage);
			reject(new DOMException('The operation either timed out or was not allowed'));
		}, getPublicKeyTimeout(options));
	});
}

function getPublicKeyTimeout(options?: {publicKey?: {timeout?: number}}): number {
	return (options && options.publicKey && options.publicKey.timeout || 60) * 1000;
}