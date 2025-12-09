/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      // Custom breakpoints for game UI
      screens: {
        'xs': '375px',      // Small phones
        'sm': '640px',      // Large phones / landscape
        'md': '768px',      // Tablets
        'lg': '1024px',     // Small laptops
        'xl': '1280px',     // Desktop
        '2xl': '1536px',    // Large desktop
        // Orientation-specific breakpoints
        'portrait': { 'raw': '(orientation: portrait)' },
        'landscape': { 'raw': '(orientation: landscape)' },
        // Touch device detection
        'touch': { 'raw': '(hover: none) and (pointer: coarse)' },
        'no-touch': { 'raw': '(hover: hover) and (pointer: fine)' },
      },
      // Card sizes for responsive design
      width: {
        'card-xs': '120px',
        'card-sm': '140px',
        'card-md': '160px',
        'card-lg': '200px',
        'card-xl': '240px',
      },
      height: {
        'card-xs': '180px',
        'card-sm': '210px',
        'card-md': '240px',
        'card-lg': '300px',
        'card-xl': '360px',
      },
      minWidth: {
        'card-xs': '120px',
        'card-sm': '140px',
        'card-md': '160px',
        'card-lg': '200px',
      },
      maxWidth: {
        'card-xs': '140px',
        'card-sm': '160px',
        'card-md': '200px',
        'card-lg': '240px',
        'card-xl': '280px',
      },
      // Custom spacing for game layout
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
        '18': '4.5rem',
        '22': '5.5rem',
      },
      // Z-index scale for layered UI
      zIndex: {
        'dropdown': '50',
        'sticky': '100',
        'fixed': '200',
        'modal-backdrop': '300',
        'modal': '400',
        'popover': '500',
        'tooltip': '600',
      },
      // Custom font sizes for responsive text
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }],
        'card-title': ['0.75rem', { lineHeight: '1rem', fontWeight: '700' }],
        'card-body': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      // Game-specific colors
      colors: {
        'golem': {
          'yellow': '#FFD966',
          'green': '#6AA84F',
          'blue': '#3C78D8',
          'pink': '#E06666',
        },
      },
      // Animation durations
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      // Custom animations
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce-subtle 2s infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      // Container queries support
      containers: {
        'card': '10rem',
        'panel': '20rem',
      },
    },
  },
  plugins: [],
}
