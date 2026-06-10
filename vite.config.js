import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig
({
    // base is needed as github pages are served in a subdirectory (repo name)
    base: '/linkcalc/'
})