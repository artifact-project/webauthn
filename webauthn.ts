export type Encode<T extends object> = T extends Node | Function ? T : {
	[K in keyof T]: EncodeValue<T[K]>;
}

type EncodeValue<V> = (
	V extends BufferSource ? string :
	V extends object ? Encode<V> :
	V
)

export type EncodedPublicKeyCredentialCreationOptions = Encode<PublicKeyCredentialCreationOptions>
export type EncodedPublicKeyCredentialRequestOptions = Encode<PublicKeyCredentialRequestOptions>

export type EncodedCredentialCreationOptions = Encode<CredentialCreationOptions>
export type EncodedCredentialRequestOptions = Encode<CredentialRequestOptions>

export type EncodedPublicKeyCredential = Encode<PublicKeyCredential>
export type EncodePublicKeyCredentialUserEntity = Encode<PublicKeyCredentialUserEntity>
export type EncodePublicKeyCredentialDescriptor = Encode<PublicKeyCredentialDescriptor>


type PhaseRequest<P, R> = (params: P) => Promise<R> | R;
type PhaseRequestReturnType<T> = T extends PhaseRequest<any, infer R> ? R : never

type MultiPhaseRequest<
	P extends object,
	PR extends PhaseRequest<any, any>,
> = ((params: P) => Promise<PhaseRequestReturnType<PR>>) & {
	phase: <T extends PhaseRequest<PhaseRequestReturnType<PR>, any>>(request: T) => MultiPhaseRequest<P, T>;
};

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
	let options: O;
	const extra = Object(Object.entries(target).reduce((e, [key, val]) => {
		if (key === 'options') {
			try {
				options = decode(val) as O;
			} catch (err) {
				throw new Error(`Parse ${decode.name} failed: ${err}`);
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
	T extends WithOptions<EncodedCredentialCreationOptions>,
>(data: T) {
	return parseAsOptionsAndExtra(decodeCredentialCreationOptions, data);
}

export function parseAsCredentialRequestOptionsAndExtra<
	T extends WithOptions<EncodedCredentialRequestOptions>,
>(data: T) {
	return parseAsOptionsAndExtra(decodeCredentialRequestOptions, data);
}

export function decodeBuffer(value: string): ArrayBuffer {
	return Uint8Array.from(atob(value), charToCode);
}

export function encodeBuffer(buffer: ArrayBuffer): string {
	return btoa(new Uint8Array(buffer).reduce(concatByteToStr, ''));
}

export function decodePublicKeyCredentialCreationOptions(publicKey: EncodedPublicKeyCredentialCreationOptions): PublicKeyCredentialCreationOptions {
	return {
		...publicKey,
		...{
			challenge: decodeBuffer(publicKey.challenge),
			user: decodeUser(publicKey.user),
			excludeCredentials: decodeCredentials(publicKey.excludeCredentials),
		},
	};
}

export function decodePublicKeyCredentialRequestOptions(publicKey: EncodedPublicKeyCredentialRequestOptions): PublicKeyCredentialRequestOptions {
	return {
		...publicKey,
		...{
			challenge: decodeBuffer(publicKey.challenge),
			allowCredentials: decodeCredentials(publicKey.allowCredentials),
		},
	};
}

/** navigation.credentials.create(options) */
export function decodeCredentialCreationOptions(options: EncodedCredentialCreationOptions): CredentialCreationOptions {
	return {
		...options,
		...{
			publicKey: decodePublicKeyCredentialCreationOptions(options.publicKey),
		},
	};
}

/** navigation.credentials.get(options) */
export function decodeCredentialRequestOptions(options: EncodedCredentialRequestOptions): CredentialRequestOptions {
	return {
		...options,
		...{
			publicKey: decodePublicKeyCredentialRequestOptions(options.publicKey),
		},
	};
}

export function encodeAttestationResponsePayload(credential: PublicKeyCredential): EncodedPublicKeyCredential {
	const response = credential.response as AuthenticatorAttestationResponse;

	return {
		id: credential.id,
		rawId: encodeBuffer(credential.rawId),
		type: credential.type,
		response: {
			attestationObject: encodeBuffer(response.attestationObject),
			clientDataJSON: encodeBuffer(response.clientDataJSON),
		},
	};
}

export function encodeAssertionResponsePlayload(credential: PublicKeyCredential): EncodedPublicKeyCredential {
	const response = credential.response as AuthenticatorAssertionResponse;

	return {
		id: credential.id,
		rawId: encodeBuffer(credential.rawId),
		type: credential.type,
		response: {
			clientDataJSON: encodeBuffer(response.clientDataJSON),
			authenticatorData: encodeBuffer(response.authenticatorData),
			signature: encodeBuffer(response.signature),
			userHandle: encodeBuffer(response.userHandle),
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

function decodeUser(user: EncodePublicKeyCredentialUserEntity): PublicKeyCredentialUserEntity {
	return decodeObjectId(user);
}

function decodeCredentials(credentials: EncodePublicKeyCredentialDescriptor[]): PublicKeyCredentialDescriptor[] {
	return credentials ? credentials.map(decodeCredentialDescriptor) : [];
}

function decodeCredentialDescriptor(credential: EncodePublicKeyCredentialDescriptor): PublicKeyCredentialDescriptor {
	return decodeObjectId(credential);
}