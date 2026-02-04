module.exports = {
  theme: {
    extend: {
      maxWidth: {
        'um': 'var(--um-content-max)',
      },
      padding: {
        'um': 'var(--um-content-padding)',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '3rem',
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
        },
      },
      colors: {
        'dark-blue': {
          900: '#0a1628',
          800: '#0f1f35',
          700: '#152438',
          600: '#1a2a3a',
        },
      },
    },
  },
}

