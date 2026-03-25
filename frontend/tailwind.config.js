/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: 'rgb(var(--background) / <alpha-value>)',
                card: 'rgb(var(--card) / <alpha-value>)',
                primary: 'rgb(var(--primary) / <alpha-value>)',
                secondary: 'rgb(var(--secondary) / <alpha-value>)',
                danger: 'rgb(var(--danger) / <alpha-value>)',
                success: 'rgb(var(--success) / <alpha-value>)',
                gold: '#FFD700',
                crimson: '#DC143C',
                text: {
                    DEFAULT: 'rgb(var(--text) / <alpha-value>)',
                    muted: 'rgb(var(--text-muted) / <alpha-value>)'
                }
            }
        },
    },
    plugins: [],
}
