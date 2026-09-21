window.tailwind = {
  config: {
    theme: {
      extend: {
        colors: {
          primary: '#2D6A4F',   // Deep Canopy Green — nav, headers, buttons
          'primary-hover': '#245a42',  // Darker shade for hover states
          secondary: '#52B788',   // Vibrant Leaf Green — active states, progress
          accent: '#E9C46A',   // Soft Sunlight — badges, warnings, highlights
          'text-dark': '#1B2621',   // Dark Pine — body copy and headings
          'text-muted': '#748C7E',   // Moss Gray — placeholders, subtitles
          'bg-app': '#F7FAF7',   // Eco Off-White — main app background
          surface: '#FFFFFF',   // Pure White — cards, modals, dropdowns
          danger: '#E63946',   // Error states
          'danger-light': '#FEE2E2',   // Error backgrounds
          'success-light': '#D1FAE5',  // Success backgrounds
          'accent-light': '#FEF9EC',   // Accent backgrounds
          'primary-light': '#E8F5EE',  // Primary tint backgrounds
          border: '#D4E6DA',   // Subtle borders
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
        },
        boxShadow: {
          card: '0 1px 3px rgba(27,38,33,0.08), 0 1px 2px rgba(27,38,33,0.06)',
          nav: '2px 0 8px rgba(27,38,33,0.10)',
        }
      }
    }
  }
};
