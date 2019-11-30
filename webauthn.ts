export * from './src/allow';
export * from './src/credentials';
export * from './src/utils';
export { getLogEntries } from './src/logger';

import {
	globalThis,
	selfOrigin,
	allowFrom,
} from './src/allow';
import { allowFor } from './src/credentials';

if (parent === globalThis) {
	// Даже если мы не в iframe, всё равно нужно разрешение
	allowFor([selfOrigin]);
	allowFrom([selfOrigin]);
}