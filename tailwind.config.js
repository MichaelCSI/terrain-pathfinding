// tailwind.config.js
export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx,vue}',
    ],
    theme: {
        extend: {
            colors: {
                primary: 'rgb(0, 0, 0)',
                secondary: 'rgb(0, 255, 208)',
            },
        },
    },
    plugins: [],
    important: true,
};
