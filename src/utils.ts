
import { log } from './logger';


export type Encode<T extends object> = T extends Node | Function ? T : {
	[K in keyof T]: EncodeValue<T[K]>;
}

type EncodeValue<V> = (
	V extends BufferSource ? string :
	V extends object ? Encode<V> :
	V
)

type PublicKeyCredentialWithResponse<
	R extends AuthenticatorAttestationResponse | AuthenticatorAssertionResponse
> = PublicKeyCredential & {
	readonly response: R
};

type PublicKeyCredentialWithAttestationResponse = PublicKeyCredentialWithResponse<AuthenticatorAttestationResponse>;
type PublicKeyCredentialWithAssertionResponse = PublicKeyCredentialWithResponse<AuthenticatorAssertionResponse>;

type PhaseRequest<P, R> = (params: P) => Promise<R> | R;
type PhaseRequestReturnType<T> = T extends PhaseRequest<any, infer R> ? R : never

type MultiPhaseRequest<
	P extends object,
	PR extends PhaseRequest<any, any>,
> = ((params: P) => Promise<PhaseRequestReturnType<PR>>) & {
	phase: <T extends PhaseRequest<PhaseRequestReturnType<PR>, any>>(request: T) => MultiPhaseRequest<P, T>;
}

function createPhaseRequest<
	P extends object,
	PR extends PhaseRequest<any, any>
>(
	phases: PhaseRequest<any, any>[],
	phaseRequest: PR,
): MultiPhaseRequest<P, PR> {
	const queue = phases.concat(phaseRequest);
	const req = (params: P) => queue.reduce(
		(queue, worker) => queue.then((params: object) => worker(params)),
		Promise.resolve(params),
	);
	req.phase = (worker: PhaseRequest<any, any>) => createPhaseRequest(queue, worker);
	return req;
}

export function createMultiPhaseRequest<P extends object>(): MultiPhaseRequest<P, PhaseRequest<P, P>> {
	return createPhaseRequest([], (params: P) => params);
}

function fetchParseJSON(response: Response) {
	if (response.status == 200 || response.status == 201) {
		return response.json();
	} else {
		throw new Error(`Parse 'fetch' response failed: [${response.status}] ${response.statusText}`);
	}
}

export function fetchJSON<T extends object>(url: string, params: object): Promise<T> {
	return fetch(url, {
		method: 'POST',
		mode: 'cors',
		credentials: 'include',
		body: Object.entries(params).reduce((form, [key, value]) => {
			form.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
			return form;
		}, new FormData),
	})
		.then(fetchParseJSON);
}

type InputInfer<T> = T extends (inp: infer I) => any ? I : never;
type OutputInfer<T> = T extends (_: any) => infer O ? O : never;
type WithOptions<T> = {options: T};
type OptionsAndExtra<T extends WithOptions<any>, O> = {
	extra: Omit<T, 'options'>;
	options: O;
}

function parseAsOptionsAndExtra<
	D extends (input: object) => object,
	T extends WithOptions<InputInfer<D>>,
	O extends OutputInfer<D>,
>(
	decode: D,
	target: T,
): OptionsAndExtra<T, O> {
	let options = {} as O;
	const extra = Object(Object.entries(target).reduce((e, [key, val]) => {
		if (key === 'options') {
			try {
				options = decode(val) as O;
			} catch (error) {
				log('parseAsOptionsAndExtra failed', {error, key, val});
				throw new Error(`Parse ${decode.name} (key: ${key}, val: ${val}) failed: ${error}`);
			}
		} else {
			e[key] = val;
		}
		return e;
	}, {}));

	return {
		extra,
		options,
	};
}

export function parseAsCredentialCreationOptionsAndExtra<
	T extends WithOptions<Encode<CredentialCreationOptions>>,
>(data: T) {
	return parseAsOptionsAndExtra(decodeCredentialCreationOptions, data);
}

export function parseAsCredentialRequestOptionsAndExtra<
	T extends WithOptions<Encode<CredentialRequestOptions>>,
>(data: T) {
	return parseAsOptionsAndExtra(decodeCredentialRequestOptions, data);
}

export function decodeBuffer(value: string): ArrayBuffer {
	try {
		return Uint8Array.from(atob(value), charToCode);
	} catch (error) {
		log('decodeBuffer failed', {error, value});
		return new Uint8Array([]);
	}
}

export function encodeBuffer(buffer: ArrayBuffer ): string {
	try {
		return btoa(new Uint8Array(buffer).reduce(concatByteToStr, ''));
	} catch (error) {
		log('encodeBuffer failed', {error, buffer});
		return '';
	}
}

export function decodeTXAuthGenericArg(tx: Encode<txAuthGenericArg>): txAuthGenericArg {
	return {
		...tx,
		content: decodeBuffer(tx.content),
	};
}

export function decodeEncodedAuthenticationExtensions(ext: Encode<AuthenticationExtensionsClientInputs>) {
	const result:AuthenticationExtensionsClientInputs = {
		...ext,
		authnSel: ext.authnSel ? ext.authnSel.map(decodeBuffer) : undefined,
		txAuthGeneric: ext.txAuthGeneric ? decodeTXAuthGenericArg(ext.txAuthGeneric) : undefined,
	};

	return result;
}

export function decodePublicKeyCredentialCreationOptions(pk: Encode<PublicKeyCredentialCreationOptions>) {
	const opts: PublicKeyCredentialCreationOptions = {
		...pk,
		challenge: decodeBuffer(pk.challenge),
		user: decodeUser(pk.user),
		excludeCredentials: pk.excludeCredentials ? decodeCredentials(pk.excludeCredentials) : undefined,
		extensions: pk.extensions ? decodeEncodedAuthenticationExtensions(pk.extensions) : undefined,
	}

	return opts;
}

export function decodePublicKeyCredentialRequestOptions(pk: Encode<PublicKeyCredentialRequestOptions>): PublicKeyCredentialRequestOptions {
	return {
		...pk,
		...{
			challenge: decodeBuffer(pk.challenge),
			allowCredentials: pk.allowCredentials ? decodeCredentials(pk.allowCredentials) : undefined,
			extensions: pk.extensions ? decodeEncodedAuthenticationExtensions(pk.extensions) : undefined,
		},
	};
}

/** navigation.credentials.create(options) */
export function decodeCredentialCreationOptions(options: Encode<CredentialCreationOptions>): CredentialCreationOptions {
	return {
		...options,
		...{
			publicKey: options.publicKey ? decodePublicKeyCredentialCreationOptions(options.publicKey) : undefined,
		},
	};
}

/** navigation.credentials.get(options) */
export function decodeCredentialRequestOptions(options: Encode<CredentialRequestOptions>): CredentialRequestOptions {
	return {
		...options,
		...{
			publicKey: options.publicKey ? decodePublicKeyCredentialRequestOptions(options.publicKey) : undefined,
		},
	};
}

export function encodeAttestationResponsePayload(credential: PublicKeyCredentialWithAttestationResponse): Encode<PublicKeyCredentialWithAttestationResponse> {
	const { response } = credential;

	return {
		...credential,
		rawId: encodeBuffer(credential.rawId),
		response: {
			attestationObject: encodeBuffer(response.attestationObject),
			clientDataJSON: encodeBuffer(response.clientDataJSON),
		},
	};
}

export function encodeAssertionResponsePlayload(credential: PublicKeyCredentialWithAssertionResponse): Encode<PublicKeyCredentialWithAssertionResponse> {
	const { response } = credential;

	return {
		...credential,
		rawId: encodeBuffer(credential.rawId),
		type: credential.type,
		response: {
			clientDataJSON: encodeBuffer(response.clientDataJSON),
			authenticatorData: encodeBuffer(response.authenticatorData),
			signature: encodeBuffer(response.signature),
			userHandle: response.userHandle ? encodeBuffer(response.userHandle) : null,
		},
	};
}

function charToCode(chr: string) {
	return chr.charCodeAt(0);
}

function concatByteToStr(str: string, byte: number) {
	return str + String.fromCharCode(byte)
}

function decodeObjectId<T extends {id: string}>(obj: T): T & {id: BufferSource} {
	return {
		...obj,
		...{id: decodeBuffer(obj.id)},
	};
}

function decodeUser(user: Encode<PublicKeyCredentialUserEntity>): PublicKeyCredentialUserEntity {
	return decodeObjectId(user);
}

function decodeCredentials(credentials: Encode<PublicKeyCredentialDescriptor[]>): PublicKeyCredentialDescriptor[] {
	return credentials ? credentials.map(decodeCredentialDescriptor) : [];
}

function decodeCredentialDescriptor(credential: Encode<PublicKeyCredentialDescriptor>): PublicKeyCredentialDescriptor {
	return decodeObjectId(credential);
}