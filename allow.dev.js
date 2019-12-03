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

	function encodeBuffer(buffer) {
	    try {
	        return btoa(new Uint8Array(buffer).reduce(concatByteToStr, ''));
	    }
	    catch (error) {
	        log('encodeBuffer failed', { error: error, buffer: buffer });
	        return '';
	    }
	}
	function encodeAttestationResponsePayload(credential) {
	    var response = credential.response;
	    return __assign(__assign({}, credential), { id: credential.id, type: credential.type, rawId: encodeBuffer(credential.rawId), response: __assign(__assign({}, response), { attestationObject: encodeBuffer(response.attestationObject), clientDataJSON: encodeBuffer(response.clientDataJSON) }) });
	}
	function encodeAssertionResponsePlayload(credential) {
	    var response = credential.response;
	    return __assign(__assign({}, credential), { id: credential.id, rawId: encodeBuffer(credential.rawId), type: credential.type, response: __assign(__assign({}, response), { clientDataJSON: encodeBuffer(response.clientDataJSON), authenticatorData: encodeBuffer(response.authenticatorData), signature: encodeBuffer(response.signature), userHandle: response.userHandle ? encodeBuffer(response.userHandle) : null }) });
	}
	function concatByteToStr(str, byte) {
	    return str + String.fromCharCode(byte);
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

	exports.allowFrom = allowFrom;
	exports.getLogEntries = getLogEntries;
	exports.selfOrigin = selfOrigin;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
