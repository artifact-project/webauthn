import {
	EncodedPublicKeyCredentialCreationOptions,
	EncodedPublicKeyCredentialRequestOptions,
	EncodedCredentialCreationOptions,
	EncodedCredentialRequestOptions,
	EncodedPublicKeyCredential,
	EncodePublicKeyCredentialUserEntity,
	EncodePublicKeyCredentialDescriptor,
} from './types';

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

//
// Private
//

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