import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // bwave brand colors from logo
        bwave: {
          navy: '#151719',      // Dark navy/charcoal
          blue: '#2892D7',      // Primary blue
          cyan: '#28E2CF',      // Bright cyan/teal
          purple: '#826AED',    // Purple accent
          pink: '#F87AA0',      // Pink accent
        },
        // Neutral slate palette (fallback)
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
    },
  },
  plugins: [],
}
export default config
