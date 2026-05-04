export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0d0d0f',
        surface: '#16161a',
        card:    '#1e1e24',
        border:  '#2e2e38',
        accent:  '#7c5cfc',
        'accent-soft': '#3d2e7a',
        lime:    '#c2f567',
        muted:   '#72728a',
        subtle:  '#3a3a48',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"','monospace'],
        sans: ['"Syne"','sans-serif'],
      },
    },
  },
  plugins: [],
}
