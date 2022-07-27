import resolve from '@rollup/plugin-node-resolve'
import { terser } from "rollup-plugin-terser";

export default {
    input: './index.js',
    output: {
        file: './lib/index.js',
        format: 'umd',
        name: 'IoDb',
        sourcemap: true
    },
    plugins: [
        resolve(['.js', '.ts']),
        terser({
            output: {
                comments: false
            }
        })
    ]
}
