import { credentials, isCredentialsSupported, allowFor } from './credentials';
import { globalThis, allowFrom, selfOrigin, RevokeAllow } from './allow';

Object.defineProperties(MessageEvent.prototype, {
	origin: { value: selfOrigin },
	source: { value: globalThis },
});

Object.defineProperty(globalThis, 'PublicKeyCredential', {
	configurable: true,
	value: () => {},
});

describe('credentials', () => {
	allowFor([selfOrigin]);

	describe('not supported', () => {
		it('isCredentialsSupported', () => {
			expect(isCredentialsSupported()).toBe(false);
		})

		it('create', async () => {
			try {
				await credentials.create();
			} catch (err) {
				expect(`${err}`).toBe(`Error: credentials.create(...) not supported`);
			}
		});

		it('get', async () => {
			try {
				await credentials.get();
			} catch (err) {
				expect(`${err}`).toBe(`Error: credentials.get(...) not supported`);
			}
		});
	});

	describe('supported (mocked)', () => {
		let unallowFrom: RevokeAllow;

		beforeAll(() => { unallowFrom = allowFrom([selfOrigin]); });
		afterAll(() => {
			unallowFrom();
		});

		beforeAll(() => {
			Object.defineProperty(globalThis.navigator, 'credentials', {
				configurable: true,
				value: {
					create(options?: CredentialCreationOptions) {
						// todo: перести логику из autotest-example
						return Promise.resolve({options, response: {attestationObject: {}}});
					},

					get(options?: CredentialRequestOptions) {
						return Promise.resolve({options, response: {}});
					},
				},
			});
		});

		afterAll(() => {
			Object.defineProperty(globalThis.navigator, 'credentials', {
				configurable: true,
				value: undefined,
			});
		});

		it('isCredentialsSupported', () => {
			expect(isCredentialsSupported()).toBe(true);
		});

		it('create', async () => {
			expect((await credentials.create({foo: 'bar'} as any) as any).options).toEqual({foo: 'bar'});
		});

		it('get', async () => {
			expect((await credentials.get({bar: 'qux'} as any) as any).options).toEqual({bar: 'qux'});
		});
	});
});