import 'mocha';
import '@wdio/sync';
import {CreateAttestationForCredentialsCreateConfirm} from '../../utils/webauthn';
import WebAuthnMocks from '../../utils/mocks';

describe('WebAuthn', function () {
	it('should work', function () {
		browser.url('/');

		browser.$('.tutorial-container').waitForDisplayed();
		browser.execute(function () {
			document.querySelector('.header').remove();
		});

		const nameInput = browser.$('.tutorial-step-1-input');
		nameInput.waitForExist();
		nameInput.scrollIntoView();
		nameInput.setValue('test@mail.ru');

		WebAuthnMocks.CredentialsCreateMock();
		WebAuthnMocks.CredentialsGetMock();

		const step1Button = browser.$('.tutorial-step-1-register');
		step1Button.scrollIntoView();
		step1Button.click();

		browser.waitUntil(function () {
			return browser.execute(function () {
				return !!window.credentialsCreateArgs;
			});
		});

		const privateKey = WebAuthnMocks.ReplaceCredentialsCreateResponse(true);

		browser.waitUntil(function () {
			return browser.execute(function () {
				return document.querySelector('#tutorial-step-3-data-raw-id').textContent.trim().length > 0
			});
		});

		const step3Button = browser.$('.tutorial-step-3-next');
		step3Button.scrollIntoView();
		step3Button.click();

		browser.waitUntil(function () {
			return browser.execute(function () {
				return document.querySelector('.tutorial-step-4-allow-credentials-id-code').textContent.trim().length > 0
			});
		});

		const step4Button = browser.$('.tutorial-step-4-login');
		step4Button.scrollIntoView();
		step4Button.click();

		browser.waitUntil(function () {
			return browser.execute(function () {
				return !!window.credentialsGetArgs;
			});
		});

		WebAuthnMocks.replaceCredentialsGetResponse(true, privateKey);

		const success = browser.$('.tutorial-step-6-container.active');
		success.waitForExist();
		success.scrollIntoView();
		success.click();

		browser.pause(2500);
	});
});
