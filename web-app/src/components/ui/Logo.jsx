import React from 'react';

/**
 * MicroHelio official brand logo component.
 *
 * @param {Object} props
 * @param {'light' | 'dark'} [props.theme='light'] - Theme variant ('light' for white/light backgrounds, 'dark' for dark backgrounds)
 * @param {'full' | 'icon'} [props.variant='full'] - 'full' shows icon + app name text + subtitle; 'icon' shows squircle icon mark only.
 * @param {string} [props.className='h-8 w-auto'] - Custom CSS classes for sizing and styling.
 * @param {boolean} [props.showSubtitle=true] - Whether to display the "SMART MICROGRID SYSTEM" subtitle in full mode.
 */
export default function Logo({
    theme = 'light',
    variant = 'full',
    className = 'h-8 w-auto',
    showSubtitle = true,
    ...props
}) {
    const isDark = theme === 'dark';

    if (variant === 'icon') {
        return (
            <svg
                viewBox="0 0 56 60"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                aria-label="MicroHelio Logo"
                {...props}
            >
                <defs>
                    <linearGradient id="iconCanopyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2D6A4F" />
                        <stop offset="100%" stopColor="#1B4332" />
                    </linearGradient>
                </defs>

                {/* Icon Container */}
                <rect
                    x="4"
                    y="6"
                    width="48"
                    height="48"
                    rx="12"
                    fill={isDark ? '#1B4332' : 'url(#iconCanopyGrad)'}
                    stroke={isDark ? 'rgba(255,255,255,0.15)' : 'none'}
                    strokeWidth={isDark ? 1 : 0}
                />

                {/* Microgrid Outer Hexagon Ring */}
                <polygon
                    points="28,13 42.7,21.5 42.7,38.5 28,47 13.3,38.5 13.3,21.5"
                    fill="none"
                    stroke="#52B788"
                    strokeWidth="2"
                    strokeOpacity={isDark ? '0.8' : '0.6'}
                    strokeLinejoin="round"
                />

                {/* Solar Rays / Grid Spokes */}
                <line x1="28" y1="13" x2="28" y2="18" stroke="#E9C46A" strokeWidth="2" strokeLinecap="round" />
                <line x1="42.7" y1="21.5" x2="38" y2="24" stroke="#E9C46A" strokeWidth="2" strokeLinecap="round" />
                <line x1="13.3" y1="21.5" x2="18" y2="24" stroke="#E9C46A" strokeWidth="2" strokeLinecap="round" />

                {/* Helio Sun Core */}
                <circle cx="28" cy="27" r="7" fill="#E9C46A" />

                {/* Vibrant Leaf Energy Wave */}
                <path
                    d="M13.3,38.5 C19,32 27,34 42.7,26 C41,38 33,45 28,47 C21,45 15,41 13.3,38.5 Z"
                    fill="#52B788"
                />

                {/* Grid Nodes */}
                <circle cx="28" cy="13" r="2.5" fill="#E9C46A" />
                <circle cx="42.7" cy="21.5" r="2.5" fill="#52B788" />
                <circle cx="13.3" cy="38.5" r="2.5" fill="#FFFFFF" />
                <circle cx="28" cy="47" r="2.5" fill="#52B788" />
            </svg>
        );
    }

    return (
        <svg
            viewBox={showSubtitle ? '0 0 260 60' : '0 0 260 48'}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-label="MicroHelio Logo"
            {...props}
        >
            <defs>
                <linearGradient id={`canopyGrad_${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2D6A4F" />
                    <stop offset="100%" stopColor="#1B4332" />
                </linearGradient>
            </defs>

            {/* Icon Container */}
            <rect
                x="4"
                y="6"
                width="48"
                height="48"
                rx="12"
                fill={isDark ? '#1B4332' : `url(#canopyGrad_${theme})`}
                stroke={isDark ? 'rgba(255,255,255,0.15)' : 'none'}
                strokeWidth={isDark ? 1 : 0}
            />

            {/* Microgrid Outer Hexagon Ring */}
            <polygon
                points="28,13 42.7,21.5 42.7,38.5 28,47 13.3,38.5 13.3,21.5"
                fill="none"
                stroke="#52B788"
                strokeWidth="2"
                strokeOpacity={isDark ? '0.8' : '0.6'}
                strokeLinejoin="round"
            />

            {/* Solar Rays / Grid Spokes */}
            <line x1="28" y1="13" x2="28" y2="18" stroke="#E9C46A" strokeWidth="2" strokeLinecap="round" />
            <line x1="42.7" y1="21.5" x2="38" y2="24" stroke="#E9C46A" strokeWidth="2" strokeLinecap="round" />
            <line x1="13.3" y1="21.5" x2="18" y2="24" stroke="#E9C46A" strokeWidth="2" strokeLinecap="round" />

            {/* Helio Sun Core */}
            <circle cx="28" cy="27" r="7" fill="#E9C46A" />

            {/* Vibrant Leaf Energy Wave */}
            <path
                d="M13.3,38.5 C19,32 27,34 42.7,26 C41,38 33,45 28,47 C21,45 15,41 13.3,38.5 Z"
                fill="#52B788"
            />

            {/* Grid Nodes */}
            <circle cx="28" cy="13" r="2.5" fill="#E9C46A" />
            <circle cx="42.7" cy="21.5" r="2.5" fill="#52B788" />
            <circle cx="13.3" cy="38.5" r="2.5" fill="#FFFFFF" />
            <circle cx="28" cy="47" r="2.5" fill="#52B788" />

            {/* Typography */}
            <text
                x="64"
                y="36"
                fontFamily="'Inter', system-ui, -apple-system, sans-serif"
                fontSize="25"
                fontWeight="800"
                letterSpacing="-0.5"
            >
                <tspan fill={isDark ? '#FFFFFF' : '#1B2621'}>Micro</tspan>
                <tspan fill={isDark ? '#52B788' : '#2D6A4F'}>Helio</tspan>
            </text>
            <circle cx="204" cy="22" r="3.5" fill="#E9C46A" />

            {/* Subtitle */}
            {showSubtitle && (
                <text
                    x="65"
                    y="49"
                    fontFamily="'Inter', system-ui, -apple-system, sans-serif"
                    fontSize="8.5"
                    fontWeight="700"
                    fill={isDark ? '#A7D7C5' : '#748C7E'}
                    letterSpacing="1.6"
                >
                    SMART MICROGRID SYSTEM
                </text>
            )}
        </svg>
    );
}
