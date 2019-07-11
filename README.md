@artifact-project/webauthn
--------------------------
A set of tools for building an API and interacts with [WebAuthn](https://webauthn.me/).

---

### Credential Create Request (aka Registration)

- [navigation.credentials.create](https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/create)

```ts
import {
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
	.phase(({options, extra}) => navigate.navigator.create(options).then(credential => ({
		extra,
		options,
		credential,
	})))
	.phase(
		({extra, credential, options}) => fetchJSON('/api/v1/webauthn/credentials/create/confirm', {
			...extra,
			response: encodeAttestationResponsePayload(credential),
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
	.phase(({options, extra}) => navigate.navigator.get(options).then(credential => ({
		extra,
		options,
		credential,
	})))
	.phase(
		({extra, credential, options}) => fetchJSON('/api/v1/webauthn/credentials/get/confirm', {
			...extra,
			response: encodeAssertionResponsePlayload(credential),
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
