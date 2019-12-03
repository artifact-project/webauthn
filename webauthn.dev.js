(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global.webauthn = {}));
}(this, (function (exports) { 'use strict';

	var entries = [];
	function log(msg, detail) {
	    if (detail === void 0) { detail = null; }
	    {
	        {
	            console.log(msg, detail);
	        }
	    }
	    entries.push({ msg: "" + msg, detail: detail });
	}
	function verbose(msg, detail) {
	    if (detail === void 0) { detail = null; }
	    {
	        {
	            console.log("[verbose] " + msg, detail);
	        }
	    }
	}
	function getLogEntries() {
	    return entries;
	}

	/*! *****************************************************************************
	Copyright (c) Microsoft Corporation. All rights reserved.
	Licensed under the Apache License, Version 2.0 (the "License"); you may not use
	this file except in compliance with the License. You may obtain a copy of the
	License at http://www.apache.org/licenses/LICENSE-2.0

	THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
	KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
	WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
	MERCHANTABLITY OR NON-INFRINGEMENT.

	See the Apache Version 2.0 License for specific language governing permissions
	and limitations under the License.
	***************************************************************************** */

	var __assign = function() {
	    __assign = Object.assign || function __assign(t) {
	        for (var s, i = 1, n = arguments.length; i < n; i++) {
	            s = arguments[i];
	            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
	        }
	        return t;
	    };
	    return __assign.apply(this, arguments);
	};

	function createPhaseRequest(phases, phaseRequest) {
	    var queue = phases.concat(phaseRequest);
	    var req = function (params) { return queue.reduce(function (queue, worker) { return queue.then(function (params) { return worker(params); }); }, Promise.resolve(params)); };
	    req.phase = function (worker) { return createPhaseRequest(queue, worker); };
	    return req;
	}
	function createMultiPhaseRequest() {
	    return createPhaseRequest([], function (params) { return params; });
	}
	function fetchParseJSON(response) {
	    if (response.status == 200 || response.status == 201) {
	        return response.json();
	    }
	    else {
	        throw new Error("Parse 'fetch' response failed: [" + response.status + "] " + response.statusText);
	    }
	}
	function fetchJSON(url, params) {
	    return fetch(url, {
	        method: 'POST',
	        mode: 'cors',
	        credentials: 'include',
	        body: Object.entries(params).reduce(function (form, _a) {
	            var key = _a[0], value = _a[1];
	            form.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
	            return form;
	        }, new FormData),
	    })
	        .then(fetchParseJSON);
	}
	function parseAsOptionsAndExtra(decode, target) {
	    var options = {};
	    var extra = Object(Object.entries(target).reduce(function (e, _a) {
	        var key = _a[0], val = _a[1];
	        if (key === 'options') {
	            try {
	                options = decode(val);
	            }
	            catch (error) {
	                log('parseAsOptionsAndExtra failed', { error: error, key: key, val: val });
	                throw new Error("Parse " + decode.name + " (key: " + key + ", val: " + val + ") failed: " + error);
	            }
	        }
	        else {
	            e[key] = val;
	        }
	        return e;
	    }, {}));
	    return {
	        extra: extra,
	        options: options,
	    };
	}
	function parseAsCredentialCreationOptionsAndExtra(data) {
	    return parseAsOptionsAndExtra(decodeCredentialCreationOptions, data);
	}
	function parseAsCredentialRequestOptionsAndExtra(data) {
	    return parseAsOptionsAndExtra(decodeCredentialRequestOptions, data);
	}
	function decodeBuffer(value) {
	    try {
	        return Uint8Array.from(atob(value), charToCode);
	    }
	    catch (error) {
	        log('decodeBuffer failed', { error: error, value: value });
	        return new Uint8Array([]);
	    }
	}
	function encodeBuffer(buffer) {
	    try {
	        return btoa(new Uint8Array(buffer).reduce(concatByteToStr, ''));
	    }
	    catch (error) {
	        log('encodeBuffer failed', { error: error, buffer: buffer });
	        return '';
	    }
	}
	function decodeTXAuthGenericArg(tx) {
	    return __assign(__assign({}, tx), { content: decodeBuffer(tx.content) });
	}
	function decodeAuthenticationExtensions(ext) {
	    var result = __assign(__assign({}, ext), { authnSel: ext.authnSel ? ext.authnSel.map(decodeBuffer) : undefined, txAuthGeneric: ext.txAuthGeneric ? decodeTXAuthGenericArg(ext.txAuthGeneric) : undefined });
	    return result;
	}
	function decodePublicKeyCredentialCreationOptions(pk) {
	    var opts = __assign(__assign({}, pk), { challenge: decodeBuffer(pk.challenge), user: decodeUser(pk.user), excludeCredentials: pk.excludeCredentials ? decodeCredentials(pk.excludeCredentials) : undefined, extensions: pk.extensions ? decodeAuthenticationExtensions(pk.extensions) : undefined });
	    return opts;
	}
	function decodePublicKeyCredentialRequestOptions(pk) {
	    return __assign(__assign({}, pk), { challenge: decodeBuffer(pk.challenge), allowCredentials: pk.allowCredentials ? decodeCredentials(pk.allowCredentials) : undefined, extensions: pk.extensions ? decodeAuthenticationExtensions(pk.extensions) : undefined });
	}
	/** navigation.credentials.create(options) */
	function decodeCredentialCreationOptions(options) {
	    return __assign(__assign({}, options), { publicKey: options.publicKey ? decodePublicKeyCredentialCreationOptions(options.publicKey) : undefined });
	}
	/** navigation.credentials.get(options) */
	function decodeCredentialRequestOptions(options) {
	    return __assign(__assign({}, options), { publicKey: options.publicKey ? decodePublicKeyCredentialRequestOptions(options.publicKey) : undefined });
	}
	function decodeAttestationResponsePayload(credential) {
	    var response = credential.response;
	    return __assign(__assign({}, credential), { rawId: decodeBuffer(credential.rawId), response: __assign(__assign({}, response), { attestationObject: decodeBuffer(response.attestationObject), clientDataJSON: decodeBuffer(response.clientDataJSON) }) });
	}
	function encodeAttestationResponsePayload(credential) {
	    var response = credential.response;
	    return __assign(__assign({}, credential), { id: credential.id, type: credential.type, rawId: encodeBuffer(credential.rawId), response: __assign(__assign({}, response), { attestationObject: encodeBuffer(response.attestationObject), clientDataJSON: encodeBuffer(response.clientDataJSON) }) });
	}
	function encodeAssertionResponsePlayload(credential) {
	    var response = credential.response;
	    return __assign(__assign({}, credential), { id: credential.id, rawId: encodeBuffer(credential.rawId), type: credential.type, response: __assign(__assign({}, response), { clientDataJSON: encodeBuffer(response.clientDataJSON), authenticatorData: encodeBuffer(response.authenticatorData), signature: encodeBuffer(response.signature), userHandle: response.userHandle ? encodeBuffer(response.userHandle) : null }) });
	}
	function decodeAssertionResponsePlayload(credential) {
	    var response = credential.response;
	    return __assign(__assign({}, credential), { rawId: decodeBuffer(credential.rawId), response: __assign(__assign({}, response), { clientDataJSON: decodeBuffer(response.clientDataJSON), authenticatorData: decodeBuffer(response.authenticatorData), signature: decodeBuffer(response.signature), userHandle: response.userHandle ? decodeBuffer(response.userHandle) : null }) });
	}
	function charToCode(chr) {
	    return chr.charCodeAt(0);
	}
	function concatByteToStr(str, byte) {
	    return str + String.fromCharCode(byte);
	}
	function decodeObjectId(obj) {
	    return __assign(__assign({}, obj), { id: decodeBuffer(obj.id) });
	}
	function decodeUser(user) {
	    return decodeObjectId(user);
	}
	function decodeCredentials(credentials) {
	    return credentials ? credentials.map(decodeCredentialDescriptor) : [];
	}
	function decodeCredentialDescriptor(credential) {
	    return decodeObjectId(credential);
	}

	var REQUEST_PID_KEY = '__webauthn:request:pid__';
	var RESPONSE_PID_KEY = '__webauthn:response:pid__';
	var FORWARDING_KEY = '__webauthn:forwarding:flag__';
	var globalThis = Function('return this')();
	var selfOrigin = globalThis.location && globalThis.location.origin || '';
	var FORWARDING_SOURCE = {};
	function allowFrom(originPatterns) {
	    var origins = convertOriginPatterns(originPatterns);
	    function handleMessage(_a) {
	        var data = _a.data, origin = _a.origin, source = _a.source;
	        if (!data) {
	            // Skip empty data
	            return;
	        }
	        var method = data.method;
	        var send = function (packed) {
	            var logMsg = "credentials." + method + "(...) send response";
	            packed[FORWARDING_KEY] = data[FORWARDING_KEY];
	            packed[RESPONSE_PID_KEY] = data[REQUEST_PID_KEY];
	            try {
	                verbose(logMsg, { packed: packed, origin: origin });
	                source.postMessage(packed, origin);
	            }
	            catch (error) {
	                log(logMsg + " failed", { error: error, packed: packed, origin: origin });
	            }
	        };
	        if (data[FORWARDING_KEY] && data[RESPONSE_PID_KEY]) {
	            try {
	                verbose('forwarding response from parent', { origin: origin, data: data });
	                FORWARDING_SOURCE[data[RESPONSE_PID_KEY]].postMessage(data, '*');
	                delete FORWARDING_SOURCE[data[RESPONSE_PID_KEY]];
	            }
	            catch (error) {
	                log('forwarding response from parent failed', { origin: origin, data: data, error: error });
	            }
	            return;
	        }
	        if (!data[REQUEST_PID_KEY]) {
	            verbose('skip post message data, because is not invoke request', { origin: origin, data: data });
	            return;
	        }
	        if (!isTrustedOrigin(origins, origin)) {
	            verbose('invoke credentials origin failed', { origin: origin, data: data });
	            return;
	        }
	        if (method) {
	            var logMsg = "invoke credentials." + method + "(...)";
	            // Forwarding the event to up
	            if (parent !== globalThis) {
	                verbose("forwarding " + logMsg, { origin: origin, data: data });
	                data[FORWARDING_KEY] = true;
	                FORWARDING_SOURCE[data[REQUEST_PID_KEY]] = source;
	                parent.postMessage(data, '*');
	                return;
	            }
	            try {
	                verbose(logMsg, { origin: origin, data: data });
	                globalThis.navigator.credentials[method](data.options)
	                    .then(function (credential) {
	                    send({
	                        response: method === 'create'
	                            ? encodeAttestationResponsePayload(credential)
	                            : encodeAssertionResponsePlayload(credential)
	                    });
	                })
	                    .catch(function (reason) {
	                    send({ failed: reason, data: data });
	                });
	            }
	            catch (error) {
	                log(logMsg + " failed", { origin: origin, data: data, error: error });
	            }
	            return;
	        }
	        verbose('unknown invoke credentials', { origin: origin, data: data });
	    }
	    log('allow from', { origins: originPatterns });
	    globalThis.addEventListener('message', handleMessage);
	    return function () {
	        log('revoke allow from', { origins: originPatterns });
	        globalThis.removeEventListener('message', handleMessage);
	    };
	}
	function convertOriginPatterns(patterns) {
	    return patterns.map(function (pattern) { return new RegExp("^" + addScheme(pattern)
	        .replace(/[\/\\^$+?.()|[\]{}]/g, '\\$&')
	        .replace(/\*/g, '[a-z0-9-]+')
	        .replace(/\\\{([a-z0-9,]+)\\\}/g, function (_, val) { return "(" + val.split(',').join('|') + ")"; }) + "$", "i"); });
	}
	function addScheme(origin) {
	    return /^https?:\/\//.test(origin) ? origin : "https://" + origin;
	}
	function isTrustedOrigin(origins, origin) {
	    return origins.some(function (re) { return re.test(origin); });
	}

	var cid = 0;
	function isCredentialsSupported() {
	    var nav = globalThis.navigator || null;
	    var nativeCredentials = nav && nav.credentials || null;
	    return !!(typeof globalThis['PublicKeyCredential'] === 'function'
	        && nativeCredentials
	        && nativeCredentials.create
	        && nativeCredentials.get);
	}
	var allowForOrigins = [];
	function allowFor(originPatterns) {
	    allowForOrigins.push.apply(allowForOrigins, convertOriginPatterns(originPatterns));
	}
	function allowedFor(origin) {
	    return isTrustedOrigin(allowForOrigins, origin);
	}
	var credentials = {
	    create: function (options) {
	        return invokeCredentials('create', options);
	    },
	    get: function (options) {
	        return invokeCredentials('get', options);
	    },
	};
	function invokeCredentials(method, options) {
	    return new Promise(function (resolve, reject) {
	        var _a;
	        if (!isCredentialsSupported()) {
	            var err = new Error("credentials." + method + "(...) not supported");
	            log(err.message, options);
	            reject(err);
	            return;
	        }
	        var pid = Date.now() + ":" + Math.random() + ":" + ++cid;
	        var handleMessage = function (_a) {
	            var data = _a.data, origin = _a.origin;
	            try {
	                if (!data || data[RESPONSE_PID_KEY] !== pid) {
	                    return;
	                }
	                if (!allowedFor(origin)) {
	                    log('remote response ignored, origin not allowed', { origin: origin, method: method, data: data });
	                    return;
	                }
	                if ('failed' in data) {
	                    verbose('response failed', { reason: data.failed, method: method, data: data });
	                    reject(data.failed);
	                    return;
	                }
	                if ('response' in data) {
	                    verbose('response received', { response: data.response, method: method, data: data });
	                    resolve(method === 'create'
	                        ? decodeAttestationResponsePayload(data.response)
	                        : decodeAssertionResponsePlayload(data.response));
	                    return;
	                }
	                log('unknown response', { method: method, data: data });
	            }
	            catch (error) {
	                log('response processing failed', { error: error, method: method, data: data });
	            }
	        };
	        globalThis.addEventListener('message', handleMessage);
	        var packet = (_a = {},
	            _a[REQUEST_PID_KEY] = pid,
	            _a.method = method,
	            _a.options = options,
	            _a);
	        try {
	            verbose('invoke remote credentials', { packet: packet });
	            parent.postMessage(packet, '*');
	        }
	        catch (error) {
	            log('response processing failed', { error: error, packet: packet });
	        }
	        setTimeout(function () {
	            globalThis.removeEventListener('message', handleMessage);
	            reject(new DOMException('The operation either timed out or was not allowed'));
	        }, getPublicKeyTimeout(options));
	    });
	}
	function getPublicKeyTimeout(options) {
	    return (options && options.publicKey && options.publicKey.timeout || 60) * 1000;
	}

	if (parent === globalThis) {
	    // Даже если мы не в iframe, всё равно нужно разрешение
	    allowFor([selfOrigin]);
	    allowFrom([selfOrigin]);
	}

	exports.FORWARDING_KEY = FORWARDING_KEY;
	exports.REQUEST_PID_KEY = REQUEST_PID_KEY;
	exports.RESPONSE_PID_KEY = RESPONSE_PID_KEY;
	exports.allowFor = allowFor;
	exports.allowFrom = allowFrom;
	exports.allowedFor = allowedFor;
	exports.convertOriginPatterns = convertOriginPatterns;
	exports.createMultiPhaseRequest = createMultiPhaseRequest;
	exports.credentials = credentials;
	exports.decodeAssertionResponsePlayload = decodeAssertionResponsePlayload;
	exports.decodeAttestationResponsePayload = decodeAttestationResponsePayload;
	exports.decodeAuthenticationExtensions = decodeAuthenticationExtensions;
	exports.decodeBuffer = decodeBuffer;
	exports.decodeCredentialCreationOptions = decodeCredentialCreationOptions;
	exports.decodeCredentialRequestOptions = decodeCredentialRequestOptions;
	exports.decodePublicKeyCredentialCreationOptions = decodePublicKeyCredentialCreationOptions;
	exports.decodePublicKeyCredentialRequestOptions = decodePublicKeyCredentialRequestOptions;
	exports.decodeTXAuthGenericArg = decodeTXAuthGenericArg;
	exports.encodeAssertionResponsePlayload = encodeAssertionResponsePlayload;
	exports.encodeAttestationResponsePayload = encodeAttestationResponsePayload;
	exports.encodeBuffer = encodeBuffer;
	exports.fetchJSON = fetchJSON;
	exports.getLogEntries = getLogEntries;
	exports.globalThis = globalThis;
	exports.isCredentialsSupported = isCredentialsSupported;
	exports.isTrustedOrigin = isTrustedOrigin;
	exports.parseAsCredentialCreationOptionsAndExtra = parseAsCredentialCreationOptionsAndExtra;
	exports.parseAsCredentialRequestOptionsAndExtra = parseAsCredentialRequestOptionsAndExtra;
	exports.selfOrigin = selfOrigin;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
