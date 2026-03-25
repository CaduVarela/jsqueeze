import * as esbuild from 'esbuild'
import { cp } from 'fs/promises'

await esbuild.build({
    entryPoints: ['adapters/chromium/injected.js'],
    bundle: true,
    outfile: 'dist/jsqueeze.bundle.js',
    format: 'iife',
    target: ['chrome112'],
})

await cp('adapters/chromium', 'dist', { recursive: true })

console.log('Build complete: dist/')
