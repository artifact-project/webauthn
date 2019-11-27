interface RelayingParty {
	id: string;
	name: string;
}

export type PlatformType = 'cross-platform' | 'platform';

type AttestationType = 'none' | 'direct' | 'indirect';

export interface CredentialsCreateArgs {
	sessionId: string;
	value: CredentialsCreateResponseOptions;
}

export interface CredentialsGetArgs {
	sessionId: string;
	value: CredentialsGetResponseOptions;
}

export interface CredentialsCreateResponseOptions {
	publicKey: CreatedCredentials;
}

export interface CredentialsGetResponseOptions {
	publicKey: GottenCredentials;
}

export interface CreatedCredentials {
	challenge: string;
	rp: RelayingParty;
	user: {
		id: string;
		name: string;
		displayName: string;
	};
	attestation: AttestationType;
	authenticatorSelection: {
		authenticatorAttachment: string;
		requireResidentKey: boolean;
	};
	pubKeyCredParams: any[];
	timeout: number;
}

export interface GottenCredentials {
	allowCredentials: CredentialsInfo[];
	challenge: string;
	rpId: string;
	timeout: number;
}

export interface CredentialsInfo {
	id: string;
	type: string;
}

export interface AttestationForCredentialsCreateConfirm {
	id: string;
	rawId: string | ArrayBuffer;
	response: {
		clientDataJSON: string | ArrayBuffer;
		attestationObject: string | ArrayBuffer;
	};
	type: string;
}

export interface AssertionForCredentialsGetConfirm {
	id: string;
	rawId: string | ArrayBuffer;
	response: {
		authenticatorData: string | ArrayBuffer;
		signature: string | ArrayBuffer;
		clientDataJSON: string | ArrayBuffer;
	};
	type: string;
}

export interface KeyFullInfo {
	name: string;
	platform_type: string;
	id: string;
	ip: string;
	[k: string]: any;
}
