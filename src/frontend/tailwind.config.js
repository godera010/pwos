/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#3b82f6",
                "background-dark": "#0b0f19",
                "card-dark": "#161b2a",
            },
            fontFamily: {
                "display": ["Inter", "sans-serif"]
            }
        }
    },
    plugins: [],
}
