/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                // Surface hierarchy — dark monochromatic foundation
                canvas: '#0a0a0b',
                surface: '#111214',
                'surface-raised': '#1a1b1e',
                'surface-overlay': '#222326',

                border: 'rgba(255, 255, 255, 0.08)',
                'border-strong': 'rgba(255, 255, 255, 0.15)',

                'text-primary': '#ffffff',
                'text-secondary': '#a1a1aa',
                'text-muted': '#52525b',

                // Brand signature color (the red 'V' mark)
                brand: '#e05c5c',
                'brand-muted': 'rgba(224, 92, 92, 0.15)',

                // Accent - muted indigo, used sparingly for interactive states only
                accent: '#8b9cf4',
                'accent-muted': 'rgba(139, 156, 244, 0.1)',
                'accent-subtle': 'rgba(139, 156, 244, 0.05)',

                // Neutral CTA (primary button fill — deliberately not chromatic)
                mist: '#e4e4e7',
                'mist-hover': '#d4d4d8',
                'mist-text': '#18181b',

                // Semantic status colors — used only to communicate real state
                success: '#22c55e',
                'success-muted': 'rgba(34, 197, 94, 0.1)',
                error: '#ef4444',
                'error-muted': 'rgba(239, 68, 68, 0.1)',
                warning: '#f59e0b',
                'warning-muted': 'rgba(245, 158, 11, 0.1)',
                info: '#3b82f6',
                'info-muted': 'rgba(59, 130, 246, 0.1)',
            },
            borderRadius: {
                sm: '4px',
                DEFAULT: '6px',
                md: '8px',
                lg: '12px',
                xl: '16px',
                '2xl': '20px',
                full: '9999px',
            },
            spacing: {
                18: '4.5rem',
                88: '22rem',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
            fontSize: {
                'heading-xl': ['48px', { lineHeight: '1.1', fontWeight: '600' }],
                'heading-lg': ['36px', { lineHeight: '1.15', fontWeight: '600' }],
                'heading-md': ['24px', { lineHeight: '1.25', fontWeight: '600' }],
                'heading-sm': ['20px', { lineHeight: '1.3', fontWeight: '500' }],
                'body-lg': ['18px', { lineHeight: '1.5', fontWeight: '400' }],
                'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
                'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
                'label': ['13px', { lineHeight: '1', fontWeight: '500', letterSpacing: '0.01em' }],
                'label-sm': ['11px', { lineHeight: '1', fontWeight: '500', letterSpacing: '0.04em' }],
                'mono-sm': ['12px', { lineHeight: '1.4', fontWeight: '400', letterSpacing: '0.02em' }],
            },
            boxShadow: {
                // Tactile inset highlight — gives surfaces a slight pressed/raised feel
                'card': 'rgba(255, 255, 255, 0.04) 0px 1px 0px 0px inset, rgba(0, 0, 0, 0.35) 0px 1px 4px 0px',
                'card-hover': 'rgba(255, 255, 255, 0.06) 0px 1px 0px 0px inset, rgba(0, 0, 0, 0.5) 0px 4px 12px 0px',
                'elevated': 'rgba(0, 0, 0, 0.5) 0px 8px 24px 0px, rgba(255, 255, 255, 0.04) 0px 1px 0px 0px inset',
                'button': 'rgba(0, 0, 0, 0.2) 0px 1px 2px 0px',
                'input-focus': '0 0 0 2px rgba(139, 156, 244, 0.2)',
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.2s ease-out forwards',
                'fade-in-down': 'fadeInDown 0.2s ease-out forwards',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                fadeInUp: {
                    from: { opacity: '0', transform: 'translateY(8px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                fadeInDown: {
                    from: { opacity: '0', transform: 'translateY(-4px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};
