import {
	decodeBuffer,
	encodeBuffer,

	decodeCredentialCreationOptions,
	decodeCredentialRequestOptions,
} from './utils';

describe('buffer', () => {
	const buf = Uint8Array.from([118, 49, 46, 102, 97, 115, 116, 46, 116, 101, 115, 116, 64, 108, 105, 115, 116, 46, 114, 117]);
	const strBuf = 'djEuZmFzdC50ZXN0QGxpc3QucnU=';

	it('decode', () => {
		expect(decodeBuffer(strBuf)).toEqual(buf);
	});

	it('encode', () => {
		expect(encodeBuffer(buf)).toEqual(strBuf);
	});
});

describe('credentials', () => {
	const credentialCreationRaw = {
		publicKey: {
			rp: {
				name: 'Mail.ru Group'
			},
			user: {
				id: 'djEuZmFzdC50ZXN0QGxpc3QucnU=',
				name: 'v1.fast.test@list.ru',
				displayName: 'v1.fast.test@list.ru',
			},
			challenge: 'gRnyAW16OQHjM66OPrYoYbpOylsXUuIdXuyP/8GMhJk=',
			pubKeyCredParams: [],
			timeout: 30000,
			authenticatorSelection: {
				requireResidentKey: false,
			},
			attestation: 'none' as AttestationConveyancePreference,
		}
	};
	const credentialRequestOptions = {
		publicKey: {
			challenge: 'l1PBtg9F2PPwC0h3O4x1DO+RC0p8bCljyxbyecWoqSU=',
			timeout: 30000,
			allowCredentials: [{
				id: 'ADSllVAKVd9NN8sVLY/74w/Nlbpj3Uz0UL0bhSOSVb3XAscknQs1x3/qB6DtySM2Oq9YU51wGEmStSVsT7lQ+KDKkMpOSLMlYrbf2h77iBSTQRVAEULEk8/Ldscx',
				type: 'public-key' as PublicKeyCredentialType,
			}],
		},
	 };

	it('decodeCredentialCreationOptions', () => {
		const raw = credentialCreationRaw;
		const options = decodeCredentialCreationOptions(raw);

		expect(options.publicKey.user.id).toEqual(decodeBuffer(raw.publicKey.user.id));
		expect(options.publicKey.challenge).toEqual(decodeBuffer(raw.publicKey.challenge));
		expect(options.publicKey.timeout).toEqual(raw.publicKey.timeout);
	});

	it('decodeCredentialRequestOptions', () => {
		const raw = credentialRequestOptions;
		const options = decodeCredentialRequestOptions(raw);

		expect(options.publicKey.challenge).toEqual(decodeBuffer(raw.publicKey.challenge));
		expect(options.publicKey.timeout).toEqual(raw.publicKey.timeout);
		expect(options.publicKey.allowCredentials[0].id).toEqual(decodeBuffer(raw.publicKey.allowCredentials[0].id));
	});
});