import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: { forge: { bg: '#070a0f', panel: '#111722', panel2: '#171f2b', line: '#2a3545', lime: '#a8ff3e', cyan: '#33e6ff' } }, boxShadow: { glow: '0 0 40px rgba(168,255,62,0.14)' } } },
  plugins: []
};
export default config;
