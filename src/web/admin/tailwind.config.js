/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0066cc',          // Action Blue
        primaryFocus: '#0071e3',     // Focus Blue
        primaryDark: '#2997ff',      // Sky Link Blue
        canvas: '#ffffff',           // Pure White
        parchment: '#f5f5f7',        // Parchment (Signature Off-white)
        pearl: '#fafafc',            // Pearl (Ghost button fill)
        tile1: '#272729',            // Near-Black Tile 1
        tile2: '#2a2a2c',            // Near-Black Tile 2
        tile3: '#252527',            // Near-Black Tile 3
        ink: '#1d1d1f',              // Near-Black Ink
        dividerSoft: '#f0f0f0',      // Divider Soft
        hairline: '#e0e0e0',         // Hairline
      },
      letterSpacing: {
        'tight-display': '-0.02em',
      },
      fontSize: {
        'body': '17px',
      },
      borderRadius: {
        'sm': '8px',
        'md': '11px',
        'lg': '18px',
      },
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-out',
        'shimmer': 'shimmer 3s ease infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
