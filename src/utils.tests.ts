import {
	decodeBuffer,
	encodeBuffer,

	decodeCredentialCreationOptions,
	decodeCredentialRequestOptions,

	parseAsCredentialCreationOptionsAndExtra,
	parseAsCredentialRequestOptionsAndExtra,

	createMultiPhaseRequest,
	Encode,
} from './utils';

const credentialCreationRaw: Encode<CredentialCreationOptions> = {
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
		attestation: 'none',
	}
};
const credentialRequestOptionsRaw: Encode<CredentialRequestOptions> = {
	publicKey: {
		challenge: 'l1PBtg9F2PPwC0h3O4x1DO+RC0p8bCljyxbyecWoqSU=',
		timeout: 30000,
		allowCredentials: [{
			id: 'ADSllVAKVd9NN8sVLY/74w/Nlbpj3Uz0UL0bhSOSVb3XAscknQs1x3/qB6DtySM2Oq9YU51wGEmStSVsT7lQ+KDKkMpOSLMlYrbf2h77iBSTQRVAEULEk8/Ldscx',
			type: 'public-key',
		}],
	},
};

describe('buffer', () => {
	const buf = Uint8Array.from([118, 49, 46, 102, 97, 115, 116, 46, 116, 101, 115, 116, 64, 108, 105, 115, 116, 46, 114, 117]);
	const strBuf = 'djEuZmFzdC50ZXN0QGxpc3QucnU=';

	it('decode', () => {
		expect(decodeBuffer(strBuf)).toEqual(buf);
	});

	it('decode undefined', () => {
		expect(decodeBuffer(undefined as any)).toEqual(new Uint8Array);
	});

	it('encode', () => {
		expect(encodeBuffer(buf)).toEqual(strBuf);
	});

	it('encode undefined', () => {
		expect(encodeBuffer(undefined as any)).toEqual('');
	});
});

describe('credentials', () => {
	it('decodeCredentialCreationOptions', () => {
		const raw = credentialCreationRaw;
		const options = decodeCredentialCreationOptions(raw);

		expect(options.publicKey!.user.id).toEqual(decodeBuffer(raw.publicKey!.user.id));
		expect(options.publicKey!.challenge).toEqual(decodeBuffer(raw.publicKey!.challenge));
		expect(options.publicKey!.timeout).toEqual(raw.publicKey!.timeout);
	});

	it('decodeCredentialRequestOptions', () => {
		const raw = credentialRequestOptionsRaw;
		const options = decodeCredentialRequestOptions(raw);

		expect(options.publicKey!.challenge).toEqual(decodeBuffer(raw.publicKey!.challenge));
		expect(options.publicKey!.timeout).toEqual(raw.publicKey!.timeout);
		expect(options.publicKey!.allowCredentials![0].id).toEqual(decodeBuffer(raw.publicKey!.allowCredentials![0].id));
	});
});

it('createMultiPhaseRequest', async () => {
	const req = createMultiPhaseRequest<{value: number}>()
		.phase(({value}) => ({foo: value + '?'}))
		.phase(({foo}) => ({bar: foo + '!'}))
	;

	expect(await req({value: 1})).toEqual({bar: '1?!'});
	expect(await req({value: 2})).toEqual({bar: '2?!'});
});

describe('parse', () => {
	it('parseAsCredentialCreationOptionsAndExtra', () => {
		const data = parseAsCredentialCreationOptionsAndExtra({
			session: '123',
			options: credentialCreationRaw,
		});

		expect(data.extra.session).toBe('123');
		expect(!!data.options.publicKey!.user.id.byteLength).toBe(true);
	});

	it('parseAsCredentialRequestOptionsAndExtra', () => {
		const data = parseAsCredentialRequestOptionsAndExtra({
			session: '321',
			options: credentialRequestOptionsRaw,
		});

		expect(data.extra.session).toBe('321');
		expect(!!data.options.publicKey!.allowCredentials![0].id.byteLength).toBe(true);
	});
});