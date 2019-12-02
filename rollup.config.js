import typescript from 'rollup-plugin-typescript2';
import replace from '@rollup/plugin-replace';
import { uglify } from 'rollup-plugin-uglify';
import ts from 'typescript';

export default ['allow', 'webauthn'].flatMap(name => [
	config(name, 'production'),
	config(name, 'development'),
]);

function config(name, env) {
	const isDev = env !== 'production';

	return {
		input: `./${name}.ts`,
		output: {
			name: 'webauthn',
			file: `${name}${isDev ? '.dev' : ''}.js`,
			format: 'umd',
		},
		plugins: [].concat(
			typescript({
				declaration: true,
				typescript: ts,
			}),
			replace({
				[`process.env.NODE_ENV`]: JSON.stringify(env),
				[`process.env.verbose`]: JSON.stringify(isDev),
			}),
			isDev ? [] : uglify()
		),
	};
}