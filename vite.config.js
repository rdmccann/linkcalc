import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig
({
    base: 'src',
    root: 'src',
    build: {
        output: '../dist'
    },
})