import { convertOriginPatterns, isTrustedOrigin, allowFrom, selfOrigin, globalThis } from './allow';
import { allowFor, allowedFor } from './credentials';

describe('allow', () => {
	describe('convertOriginPatterns', () => {
		it('second level', () => {
			expect(convertOriginPatterns(['mail.ru'])).toEqual([/^https:\/\/mail\.ru$/i]);
			expect(convertOriginPatterns(['^ma+il.ru$'])).toEqual([/^https:\/\/\^ma\+il\.ru\$$/i]);
		});

		it('const third level', () => {
			expect(convertOriginPatterns(['account.mail.ru'])).toEqual([/^https:\/\/account\.mail\.ru$/i]);
		});

		it('any third level', () => {
			expect(convertOriginPatterns(['*.mail.ru'])).toEqual([/^https:\/\/[a-z0-9-]+\.mail\.ru$/i]);
		});

		it('enum third level', () => {
			expect(convertOriginPatterns(['{id,octavius}.mail.ru'])).toEqual([/^https:\/\/(id|octavius)\.mail\.ru$/i]);
		});

		it('with http scheme', () => {
			expect(convertOriginPatterns(['http://mail.ru'])).toEqual([/^http:\/\/mail\.ru$/i]);
		});
	});

	describe('isTrustedOrigin', () => {
		it('second level', () => {
			const origins = convertOriginPatterns(['mail.ru']);
			expect(isTrustedOrigin(origins, 'https://mail.ru')).toBe(true);
			expect(isTrustedOrigin(origins, 'https://mail.ru/')).toBe(false);
			expect(isTrustedOrigin(origins, 'https://mailru')).toBe(false);
		});

		it('const third level', () => {
			const origins = convertOriginPatterns(['id.mail.ru']);
			expect(isTrustedOrigin(origins, 'https://id.mail.ru')).toBe(true);
			expect(isTrustedOrigin(origins, 'https://idmail.ru')).toBe(false);
		});

		it('any third level', () => {
			const origins = convertOriginPatterns(['*.mail.ru']);
			expect(isTrustedOrigin(origins, 'https://id.mail.ru')).toBe(true);
			expect(isTrustedOrigin(origins, 'https://account.mail.ru')).toBe(true);
			expect(isTrustedOrigin(origins, 'https://idmail.ru')).toBe(false);
			expect(isTrustedOrigin(origins, 'https://e.id.mail.ru')).toBe(false);
		});

		it('enum third level', () => {
			const origins = convertOriginPatterns(['{id,e}.mail.ru']);
			expect(isTrustedOrigin(origins, 'https://id.mail.ru')).toBe(true);
			expect(isTrustedOrigin(origins, 'https://e.mail.ru')).toBe(true);
			expect(isTrustedOrigin(origins, 'https://account.mail.ru')).toBe(false);
		});
	});

	it('allowFor', () => {
		allowFor(['mail.ru', 'id.mail.ru']);
		expect(allowedFor('https://mail.ru')).toBe(true);
		expect(allowedFor('https://id.mail.ru')).toBe(true);
		expect(allowedFor('https://e.mail.ru')).toBe(false);
	});

	it('allowFrom', () => {
		const unallow = allowFrom(['mail.ru', 'id.mail.ru']);
		expect(typeof unallow).toBe('function');
		expect(unallow()).toBe(undefined);
	});

	it('selfOrigin', () => {
		expect(selfOrigin).toBe('http://localhost');
		expect(globalThis.location.origin).toBe(selfOrigin);
	})
});