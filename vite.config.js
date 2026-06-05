import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig
({
    build
        : {
        rolldownOptions
            : {
            input
                : {
                main
                    : resolve(import.meta.dirname, 'src/index.html'),
            },
        },
    },
})