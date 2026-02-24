/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },
        navy: {
          50: '#f0f4f8', 100: '#d9e2ec', 200: '#bcccdc', 300: '#9fb3c8',
          400: '#829ab1', 500: '#627d98', 600: '#486581', 700: '#334e68',
          800: '#243b53', 900: '#102a43',
        },
        accent: { DEFAULT: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8' },
        cyan: { DEFAULT: '#06b6d4', light: '#22d3ee', dark: '#0891b2' },
        emerald: { DEFAULT: '#10b981', light: '#34d399', dark: '#059669' },
        amber: { DEFAULT: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
        danger: { DEFAULT: '#ef4444', light: '#f87171', dark: '#dc2626' },
        purple: { DEFAULT: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed' },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f8fafc',
          tertiary: '#f1f5f9',
          border: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glass': '0 4px 24px -1px rgba(0, 0, 0, 0.06), 0 2px 8px -1px rgba(0, 0, 0, 0.04)',
        'glass-lg': '0 10px 40px -3px rgba(0, 0, 0, 0.08), 0 4px 16px -2px rgba(0, 0, 0, 0.04)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.15)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.15)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.15)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.15)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.15)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
}
