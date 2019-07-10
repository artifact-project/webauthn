type Encode<T extends object> = T extends Node | Function ? T : {
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
