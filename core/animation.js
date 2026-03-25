const STYLE_ID = 'jsqueeze-animation-style'

const CSS = {
    aggressive: `
        *, *::before, *::after {
            transition-duration: 0.05s !important;
            transition-delay: 0s !important;
        }
    `,
    ultra: `
        *, *::before, *::after {
            animation: none !important;
            animation-duration: 0s !important;
            transition: none !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
        }
    `,
}

export function createAnimationModule(debug) {
    function getCss(mode) {
        if (mode === 'ultra') return CSS.ultra
        if (mode === 'aggressive') return CSS.aggressive
        return null
    }

    function start(config) {
        const css = getCss(config.mode)
        if (!css) return

        const style = document.createElement('style')
        style.id = STYLE_ID
        style.textContent = css
        document.head.appendChild(style)

        if (config.mode === 'ultra') {
            debug?.increment('blockedAnimations')
        }
    }

    function stop() {
        document.getElementById(STYLE_ID)?.remove()
    }

    return { name: 'animation', minLevel: 3, start, stop }
}
