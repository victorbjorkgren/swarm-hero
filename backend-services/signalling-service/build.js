import { build } from 'esbuild';

build({
    entryPoints: ['./main.ts'],
    bundle: true,
    outfile: './dist/main.js',
    platform: 'node',
    target: 'esnext',
    format: 'esm',
    external: ['stream', 'ws', 'jsonwebtoken', 'express', 'crypto'],
    resolveExtensions: ['.ts', '.js'],
}).catch(() => process.exit(1));