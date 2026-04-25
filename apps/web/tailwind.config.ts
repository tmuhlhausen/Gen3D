import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        forge: { bg: '#06080d', panel: '#101721', panel2: '#151e2a', line: '#293548', lime: '#a8ff3e', cyan: '#35e7ff', violet: '#9c7cff' }
      },
      boxShadow: { glow: '0 0 50px rgba(168,255,62,0.14)', panel: '0 22px 80px rgba(0,0,0,0.28)' }
    }
  },
  plugins: []
};
export default config;
