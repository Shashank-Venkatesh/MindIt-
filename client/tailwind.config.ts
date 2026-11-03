import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        graph: {
          canvas: 'var(--graph-canvas)',
          chrome: 'var(--graph-chrome)',
          line: 'var(--graph-line)',
          node: 'var(--graph-node)',
          text: 'var(--graph-text)',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
