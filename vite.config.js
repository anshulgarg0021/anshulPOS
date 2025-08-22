import { defineConfig } from 'vite'


export default defineConfig({
build: {
target: 'es2018',
minify: 'esbuild',
reportCompressedSize: true,
sourcemap: false,
rollupOptions: {
output: {
manualChunks: undefined // keep bundle simple, aids better gzip
}
}
}
})