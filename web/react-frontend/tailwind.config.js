/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
        'portrait': { 'raw': '(orientation: portrait)' },
        'landscape': { 'raw': '(orientation: landscape)' },
      },
      colors: {
        'golem-yellow': '#FFD966',
        'golem-green': '#6AA84F',
        'golem-blue': '#3C78D8',
        'golem-pink': '#E06666',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glow-yellow': '0 0 20px rgba(255, 217, 102, 0.6)',
        'glow-green': '0 0 20px rgba(106, 168, 79, 0.6)',
        'glow-blue': '0 0 20px rgba(60, 120, 216, 0.6)',
        'glow-pink': '0 0 20px rgba(224, 102, 102, 0.6)',
      },
      animation: {
        'card-hover': 'cardHover 0.3s ease-in-out',
        'card-flip': 'cardFlip 0.6s ease-in-out',
        'fly-to-hand': 'flyToHand 0.8s ease-in-out',
        'points-flash': 'pointsFlash 1s ease-in-out',
      },
      keyframes: {
        cardHover: {
          '0%': { transform: 'scale(1) translateY(0)' },
          '100%': { transform: 'scale(1.05) translateY(-8px)' },
        },
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        flyToHand: {
          '0%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
          '50%': { transform: 'translate(var(--tx), var(--ty)) scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'translate(var(--tx), var(--ty)) scale(0.5)', opacity: '0' },
        },
        pointsFlash: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.2)', opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}

