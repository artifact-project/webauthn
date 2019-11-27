import '@wdio/sync';
import {
	AssertionForCredentialsGetConfirm,
	AttestationForCredentialsCreateConfirm, CredentialsCreateArgs,
	CredentialsGetArgs
} from './webauthn.types';
import {CreateAssertionForCredentialsGetConfirm, CreateAttestationForCredentialsCreateConfirm} from './webauthn';

declare global {
	interface Window {
		credentialsCreateSuccess: (value: any) => Promise<any>;
		credentialsCreateFail: () => Promise<void>;

		[key: string]: any;
	}
}

export default class WebAuthnMocks {
	static CredentialsCreateMock() {
		browser.execute(() => {
			navigator.credentials.create = (options) => {
				window.credentialsCreateArgs = options;

				window.base64ToArrayBuffer = (base64: string) => {
					const binaryString = atob(base64);
					const length = binaryString.length;
					const bytes = new Uint8Array(length);

					for (let i = 0; i < length; i++) {
						bytes[i] = binaryString.charCodeAt(i);
					}

					return bytes.buffer;
				};

				return new Promise((resolve: any, reject: any) => {
					window.credentialsCreateSuccess = resolve;
					window.credentialsCreateFail = reject;
				});
			};
		});
	}

	static ReplaceCredentialsCreateResponse(success: boolean) {
		const {attestation, privateKey} = WebAuthnMocks.CreateCredentialsCreateResponse();

		WebAuthnMocks.SettleCredentialsCreate(attestation, success);

		return privateKey;
	}

	static CreateCredentialsCreateResponse() {
		let initialArguments: any;

		browser.waitUntil(() => {
			initialArguments = browser.execute(() => {
				return window.credentialsCreateArgs;
			}) as CredentialsCreateArgs;

			return Boolean(initialArguments);
		}, void 0, 'Не дождались аргументов navigator.credentials.create');

		return CreateAttestationForCredentialsCreateConfirm(initialArguments);
	}

	static SettleCredentialsCreate(response: AttestationForCredentialsCreateConfirm, success: boolean) {
		browser.execute((response: AttestationForCredentialsCreateConfirm, success: boolean) => {
			if (success) {
				// переводим строки в ArrayBuffer
				response.rawId = window.base64ToArrayBuffer(response.rawId);
				response.response.attestationObject = window.base64ToArrayBuffer(response.response.attestationObject);
				response.response.clientDataJSON = window.base64ToArrayBuffer(response.response.clientDataJSON);

				window.credentialsCreateSuccess(response);
			} else {
				window.credentialsCreateFail();
			}
		}, response, success);
	}

	static CredentialsGetMock() {
		browser.execute(() => {
			navigator.credentials.get = (options) => {
				window.arrayBufferToBase64 = (buffer: Uint8Array) => {
					var binary = '';
					var bytes = new Uint8Array( buffer );
					var len = bytes.byteLength;
					for (var i = 0; i < len; i++) {
						binary += String.fromCharCode( bytes[ i ] );
					}
					return window.btoa( binary );
				};

				window.credentialsGetArgs = options;
				window.credentialsGetArgs.publicKey.allowCredentials = window.credentialsGetArgs.publicKey.allowCredentials.map(function (cred) {
					const copyCred = Object.assign({}, cred);
					copyCred.id = window.arrayBufferToBase64(cred.id);
					return copyCred;
				});

				window.base64ToArrayBuffer = (base64: string) => {
					const binaryString = atob(base64);
					const length = binaryString.length;
					const bytes = new Uint8Array(length);

					for (let i = 0; i < length; i++) {
						bytes[i] = binaryString.charCodeAt(i);
					}

					return bytes.buffer;
				};

				return new Promise((resolve: any, reject: any) => {
					window.credentialsGetSuccess = resolve;
					window.credentialsGetFail = reject;
				});
			};
		});
	}

	static CreateCredentialsGetResponse(privateKey: string, credentialIdString: string) {
		let initialArguments: any;

		browser.waitUntil(() => {
			initialArguments = browser.execute(() => {
				return window.credentialsGetArgs;
			}) as CredentialsGetArgs;

			return Boolean(initialArguments);
		}, void 0, 'Не дождались аргументов navigator.credentials.get');

		const { publicKey  } = initialArguments;

		const assertionObject = CreateAssertionForCredentialsGetConfirm(publicKey, privateKey, initialArguments.publicKey.allowCredentials[0].id);

		return assertionObject as AssertionForCredentialsGetConfirm;
	}

	static replaceCredentialsGetResponse(success: boolean, privateKey: string) {
		const fakeResponse = WebAuthnMocks.CreateCredentialsGetResponse(privateKey, '');

		WebAuthnMocks.SettleCredentialsGet(fakeResponse, success);
	}

	static SettleCredentialsGet(response: AssertionForCredentialsGetConfirm, success: boolean) {
		browser.execute((response: AssertionForCredentialsGetConfirm, success: boolean) => {
			if (success) {
				// переводим строки в ArrayBuffer
				response.rawId = window.base64ToArrayBuffer(response.rawId);
				response.response.authenticatorData = window.base64ToArrayBuffer(response.response.authenticatorData);
				response.response.signature = window.base64ToArrayBuffer(response.response.signature);
				response.response.clientDataJSON = window.base64ToArrayBuffer(response.response.clientDataJSON);

				window.credentialsGetSuccess(response);
			} else {
				window.credentialsGetFail();
			}
		}, response, success);
	}
}
