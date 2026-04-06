/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: [
      "./app/**/*.{js,ts,jsx,tsx,mdx}",
      "./pages/**/*.{js,ts,jsx,tsx,mdx}",
      "./components/**/*.{js,ts,jsx,tsx,mdx}",
      "./src/**/*.{js,ts,jsx,tsx,mdx}",
      "./index.html",
    ],
    theme: {
        extend: {
            colors: {
                "primary": "var(--primary)",
                "on-primary": "var(--on-primary)",
                "primary-container": "var(--primary-container)",
                "on-primary-container": "var(--on-primary-container)",
                
                "secondary": "var(--secondary)",
                "on-secondary": "var(--on-secondary)",
                "secondary-container": "var(--secondary-container)",
                "on-secondary-container": "var(--on-secondary-container)",

                "background": "var(--background)",
                "on-background": "var(--on-background)",
                "surface": "var(--surface)",
                "on-surface": "var(--on-surface)",
                "on-surface-variant": "var(--on-surface-variant)",
                
                "outline": "var(--outline)",
                "outline-variant": "var(--outline-variant)",
                
                "error": "var(--error)",
                "on-error": "var(--on-error)",

                "surface-container-high": "#292a2b",
                "surface-container-highest": "#343536",
                "surface-container-lowest": "#0d0e0f",
                "surface-container": "#1f2021",
                "surface-container-low": "#1b1c1d",
            },
            fontFamily: {
                "headline": ["Inter", "sans-serif"],
                "body": ["Inter", "sans-serif"],
                "label": ["Inter", "sans-serif"],
                "mono": ["Berkeley Mono", "monospace"]
            },
            borderRadius: {"DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "full": "0.75rem"},
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/container-queries')
    ],
}
