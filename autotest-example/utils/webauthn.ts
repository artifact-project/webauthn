import * as crypto from 'crypto';
import * as cbor from 'cbor';
import {
	CredentialsCreateResponseOptions,
	AttestationForCredentialsCreateConfirm,
	AssertionForCredentialsGetConfirm, GottenCredentials
} from './webauthn.types';

let counter = 0;

// https://www.w3.org/TR/webauthn-1/#aaguid
const AAGUID: Buffer = crypto.randomBytes(16);

type CollectedClientDataType = string;

// используется для мока navigator.credentials.create (только возвращаемый attestation) и для добавления ключа по апи
export function CreateAttestationForCredentialsCreateConfirm(
	options: CredentialsCreateResponseOptions
) {
	const user = {
		displayName: options.publicKey.user.displayName as string,
		name: options.publicKey.user.name as string,
		id: Buffer.from(options.publicKey.user.id as string, 'base64' as BufferEncoding)
	};

	const challenge = Buffer.from(options.publicKey.challenge as string, 'base64' as BufferEncoding);

	// #### Регистрируем пользователя (создаём открытый/закрытый ключи) ####
	// see https://www.w3.org/TR/webauthn-1/#op-make-cred step 7
	// Используем node 10.16.3 и получаем publicKey: Buffer, privateKey: string
	const { publicKey, privateKey } = crypto.generateKeyPairSync(
		'ec',
		{
			namedCurve: 'prime256v1', // same that P-256 curve
			publicKeyEncoding: { type: 'spki', format: 'der' },
			privateKeyEncoding: { type: 'sec1', format: 'pem' }
		}
	);

	const CollectedClientData: CollectedClientDataType = CreateCollectedClientData(
		challenge,
		'https://webauthn.me',
		'webauthn.create'
	);
	const CollectedClientDataHash: Buffer = GetHashOfCollectedClientData(CollectedClientData);

	// используется только, чтобы сохранить взаимосвязь аккаунт <-> аутентификатор, но если аутентификатор одноразовый
	// для автотеста, то можно не сохранять
	const userHandle: Buffer = user.id;

	const credentialId: Buffer = crypto.randomBytes(16);

	const attestedCredentialData: Buffer = CreateAttestedCredentialData(credentialId, publicKey);
	const authData: Buffer = CreateAuthenticatorData(attestedCredentialData, counter);
	counter++; // увеличиваем счётчик при каждом "обращении" к аутентификатору
	const AttestationObject: Buffer = GeneratingAnAttestationObject(authData, CollectedClientDataHash, privateKey);

	const attestation: AttestationForCredentialsCreateConfirm = {
		id: credentialId.toString('base64'),
		rawId: credentialId.toString('base64'),
		response: {
			clientDataJSON: Buffer.from(CollectedClientData, 'utf8').toString('base64'),
			attestationObject: AttestationObject.toString('base64')
		},
		type: 'public-key'
	};

	return {
		attestation,
		privateKey
	};
}

export function CreateAssertionForCredentialsGetConfirm(
	publicKeyOptions: GottenCredentials,
	privateKey: string,
	credentialIdString: string
): AssertionForCredentialsGetConfirm {
	const challenge = Buffer.from(publicKeyOptions.challenge as string, 'base64' as BufferEncoding);
	const authData: Buffer = CreateAuthenticatorData(null, counter);

	counter++; // увеличиваем счётчик при каждом "обращении" к аутентификатору

	const CollectedClientData: CollectedClientDataType = CreateCollectedClientData(
		challenge,
		'https://webauthn.me',
		'webauthn.get'
	);
	const CollectedClientDataHash: Buffer = GetHashOfCollectedClientData(CollectedClientData);

	const assertionSignature: Buffer = GenerateAnAssertionSignature(authData, CollectedClientDataHash, privateKey);

	return {
		type: 'public-key',
		id: credentialIdString,
		rawId: credentialIdString,
		response: {
			authenticatorData: authData.toString('base64'),
			signature: assertionSignature.toString('base64'),
			clientDataJSON: Buffer.from(CollectedClientData, 'utf8').toString('base64')
		}
	};
}

function urlSafeBase64Encode(buffer: Buffer): string {
	return buffer.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
}

// https://www.w3.org/TR/webauthn-1/#sec-client-data
// tslint:disable-next-line:max-line-length
function CreateCollectedClientData(
	challenge: Buffer,
	origin: string,
	type: 'webauthn.create' | 'webauthn.get'
): CollectedClientDataType {
	return JSON.stringify({
		type,
		challenge: urlSafeBase64Encode(challenge),
		origin
	});
}

function GetHashOfCollectedClientData(clientData: CollectedClientDataType): Buffer {
	// This is the hash (computed using SHA-256) of the JSON-serialized client data, as constructed by the client.
	return crypto.createHash('sha256').update(clientData, 'utf8').digest();
}

function GenerateAnAssertionSignature(
	authData: Buffer,
	clientDataHash: Buffer,
	privateKey: string
): Buffer {
	return crypto.createSign('SHA256')
		.update(Buffer.concat([authData, clientDataHash]))
		.sign(privateKey);
}

function CreateAttestedCredentialData(
	credentialId: Buffer,
	publicKey: Buffer
): Buffer {
	const credentialIdLength = Buffer.alloc(2);
	credentialIdLength.writeUInt16BE(credentialId.byteLength, 0);

	const x = publicKey.subarray(27, 27 + 32);
	const y = publicKey.subarray(27 + 32, 27 + 32 + 32);

	// https://www.w3.org/TR/webauthn-1/#sctn-encoded-credPubKey-examples
	const CoseCredentialPublicKey = new Map();
	CoseCredentialPublicKey.set(1, 2);
	CoseCredentialPublicKey.set(3, -7);
	CoseCredentialPublicKey.set(-1, 1);
	CoseCredentialPublicKey.set(-2, x);
	CoseCredentialPublicKey.set(-3, y);

	const CborCoseCredentialPublicKey = cbor.encode(CoseCredentialPublicKey);

	return Buffer.concat([AAGUID, credentialIdLength, credentialId, CborCoseCredentialPublicKey]);
}

// https://www.w3.org/TR/webauthn-1/#sec-authenticator-data
function CreateAuthenticatorData(
	attestedCredentialData: Buffer | null, counter: number = 0
): Buffer {
	const rpIdHash = crypto.createHash('sha256').update('webauthn.me', 'utf8').digest();

	const flags = new Uint8Array(1);
	if (attestedCredentialData) {
		flags[0] = 0b01000101;
	} else {
		flags[0] = 0b00000101;
	}
	const signCount = Buffer.alloc(4);
	signCount.writeUInt32BE(counter, 0);
	if (attestedCredentialData) {
		return Buffer.concat([rpIdHash, flags, signCount, attestedCredentialData]);
	} else {
		return Buffer.concat([rpIdHash, flags, signCount]);
	}
}

// https://www.w3.org/TR/webauthn-1/#generating-an-attestation-object
function GeneratingAnAttestationObject(
	authData: Buffer,
	hash: Buffer,
	privateKey: string
): Buffer {
	const concated = Buffer.concat([authData, hash]);

	const sign = crypto.createSign('sha256');
	sign.write(concated);
	sign.end();
	const sig = sign.sign(privateKey);
	const attStmt = {
		alg: -7,
		sig
	};

	const fmt = 'packed';

	return cbor.encode({
		fmt,
		attStmt,
		authData
	});
}
