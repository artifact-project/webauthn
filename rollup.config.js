import typescript from 'rollup-plugin-typescript2';
import replace from 'rollup-plugin-replace';
import { uglify } from 'rollup-plugin-uglify';
import ts from 'typescript';

export default ['allow', 'webauthn'].flatMap(name => [
	config(name, true),
	config(name, false),
]);

function config(name, isDEV) {
	return {
		input: `./${name}.ts`,
		output: {
			name: 'webauthn',
			file: `${name}${isDEV ? '.dev' : ''}.js`,
			format: 'umd',
		},
		plugins: [].concat(
			typescript({
				declaration: true,
				typescript: ts,
			}),
			replace({'process.env.NODE_ENV': JSON.stringify(isDEV)}),
			isDEV ? [] : uglify()
		),
	};
}