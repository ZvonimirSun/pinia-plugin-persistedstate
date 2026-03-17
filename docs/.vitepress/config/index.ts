import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { defineConfig } from 'vitepress'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'
import { en } from './en'
import { zh } from './zh'

export default defineConfig({
  title: 'Pinia Plugin Persistedstate',
  base: '/pinia-plugin-persistedstate/',
  head: [
    ['link', {
      rel: 'icon',
      href: '/pinia-plugin-persistedstate/favicon.ico',
    }],
  ],
  sitemap: {
    hostname: 'https://prazdevs.github.io/pinia-plugin-persistedstate/',
  },
  lastUpdated: true,
  markdown: {
    typographer: true,
    codeTransformers: [
      transformerTwoslash({
        twoslashOptions: {
          compilerOptions: {
            types: ['@zvonimirsun/pinia-plugin-persistedstate'],
          },
        },
      }),
    ],
    theme: {
      dark: 'catppuccin-mocha',
      light: 'catppuccin-latte',
    },
    config(md) {
      md.use(groupIconMdPlugin)
    },
  },
  vite: {
    plugins: [
      groupIconVitePlugin({
        customIcon: {
          'nuxt': 'catppuccin:nuxt',
          '.ts': 'catppuccin:typescript',
          'pnpm': 'catppuccin:pnpm',
          'npm': 'catppuccin:npm',
          'yarn': 'catppuccin:yarn',
        },
      }),
    ],
  },
  themeConfig: {
    logo: {
      light: '/logo-light.svg',
      dark: '/logo-dark.svg',
    },
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/zvonimirsun/pinia-plugin-persistedstate',
      },
    ],
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      ...en,
    },
    zh: { label: '简体中文', ...zh },
  },
})
