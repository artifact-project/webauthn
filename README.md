@artifact-project/webauthn 🔐
-----------------------------
A set of tools for building an API and interacts with [WebAuthn](https://webauthn.me/).

```sh
npm i --save @artifact-project/webauthn
```

---

### Features

- Easy and Flexibility API 🧬
- Supported IFrames (regardless of nesting) 💪🏻
- Fully testelably ✅

---

### Using in iframe

##### In parent window
```ts
import { allowFrom } from '@artifact-project/webauthn/allow';
allowFrom(['mail.ru', '{o2,account}.mail.ru']);
```

##### Or embed the code in the parent window
```html
<html>
  <head>
    <script>
      /* Replace this comment on the code from this file: ./node_modules/@artifact-project/webauthn/allow.js */
      webauthn.allowFrom(['mail.ru', '{o2,account}.mail.ru']);
    </script>
  </head>
  <body>...</body>
</html>
```

##### Inside iframe
```ts
import { allowFor } from '@artifact-project/webauthn';
allowFor(['mail.ru', '*.mail.ru']);
```

---

### Credential Create Request (aka Registration)

- [navigation.credentials.create](https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/create)

```ts
import {
	credentials,
	createMultiPhaseRequest,
	fetchJSON,
	parseAsCredentialCreationOptionsAndExtra,
	encodeAttestationResponsePayload,
} from '@artifact-project/webauthn';

const credentialCreateRequest = createMultiPhaseRequest<{login: params}>()
	.phase((params) => fetchJSON('/api/v1/webauthn/credentials/create', params)
		.then(res => res.body)
		.then(parseAsCredentialCreationOptionsAndExtra)
	)
	.phase(({options, extra}) => credentials.create(options).then(credential => ({
		extra,
		options,
		credential,
	})))
	.phase(
		({extra, credential, options}) => fetchJSON('/api/v1/webauthn/credentials/create/confirm', {
			...extra,
			attestation: encodeAttestationResponsePayload(credential),
		}).then(res => ({
			extra: res.body,
			options,
			credential,
		}))
	)
;

credentialCreateRequest({
	login: 'ibn@rubaxa.org',
}).then(console.log);
// {
//   extra: {id: "...", login: "ibn@rubaxa.org"},
//   options: {...},
//   credential: {...},
// }
```

---

### Credential Request (aka Login)

- [navigation.credentials.get](https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/get)

```ts
import {
	credentials,
	createMultiPhaseRequest,
	fetchJSON,
	parseAsCredentialRequestOptionsAndExtra,
	encodeAssertionResponsePlayload,
} from '@artifact-project/webauthn';

const credentialRequest = createMultiPhaseRequest<{login: params}>()
	.phase((params) => fetchJSON('/api/v1/webauthn/credentials/get', params)
		.then(res => res.body)
		.then(parseAsCredentialRequestOptionsAndExtra)
	)
	.phase(({options, extra}) => credentials.get(options).then(credential => ({
		extra,
		options,
		credential,
	})))
	.phase(
		({extra, credential, options}) => fetchJSON('/api/v1/webauthn/credentials/get/confirm', {
			...extra,
			assertion: encodeAssertionResponsePlayload(credential),
		}).then(res => ({
			extra: res.body,
			options,
			credential,
		}))
	)
;

credentialRequest({
	login: 'ibn@rubaxa.org',
}).then(console.log);
// {
//   extra: {token: "...", url: "...", expires: 123},
//   options: {...},
//   credential: {...},
// }
```

---

### API

- **isCredentialsSupported**(): `boolean`
- <u>credentials</u>
  - **create**(options?: `CredentialCreationOptions`): `Promise<CredentialType | null>`
  - **get**(options?: `CredentialRequestOptions`): `Promise<CredentialType | null>`
- **createPhaseRequest**`<P extends object>`(): `(params: P) => Promise<R>`
- **fetchJSON**(url: `string`, params: `object`): `Response`
- <u>Decode</u>
  - **decodeBuffer**(value: `string`): `ArrayBuffer`
  - **decodePublicKeyCredentialCreationOptions**(value: `object`): `PublicKeyCredentialCreationOptions`
  - **decodePublicKeyCredentialRequestOptions**(value: `object`): `PublicKeyCredentialRequestOptions`
  - **decodeCredentialCreationOptions**(value: `object`): `CredentialCreationOptions`
  - **decodeCredentialRequestOptions**(value: `object`): `CredentialRequestOptions`
- <u>Encode</u>
  - **encodeBuffer**(buffer: `ArrayBuffer`): `string`
  - **encodeAttestationResponsePayload**(credential: `PublicKeyCredential`): `EncodedPublicKeyCredential`
  - **encodeAssertionResponsePlayload**(credential: `PublicKeyCredential`): `EncodedPublicKeyCredential`

---


### Development

 - `npm i`
 - `npm test`, [code coverage](./coverage/lcov-report/index.html)
