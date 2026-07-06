import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/client/index.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    clean: true,
    external: ['vite', 'vue', 'vue-i18n'],
    target: 'es2022',
    esbuildPlugins: [
        {
            name: 'external-vue-sfc',
            setup(build) {
                build.onResolve({ filter: /\.vue$/ }, () => ({ external: true }));
            },
        },
    ],
});
