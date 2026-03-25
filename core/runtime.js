const LEVELS = {
    conservative: 1,
    balanced: 2,
    aggressive: 3,
    ultra: 4,
}

export function createRuntime() {
    const modules = []
    const activeModules = new Set()
    let config = { mode: 'conservative', debug: false }

    function levelNumber(mode) {
        return LEVELS[mode] ?? 1
    }

    function register(mod) {
        modules.push(mod)
    }

    function startModule(mod) {
        if (activeModules.has(mod.name)) return
        mod.start(config)
        activeModules.add(mod.name)
    }

    function stopModule(mod) {
        if (!activeModules.has(mod.name)) return
        mod.stop()
        activeModules.delete(mod.name)
    }

    function applyLevel(mode) {
        const level = levelNumber(mode)
        for (const mod of modules) {
            if (mod.minLevel <= level) {
                startModule(mod)
            } else {
                stopModule(mod)
            }
        }
    }

    function start(opts = {}) {
        config = { mode: 'conservative', debug: false, ...opts }
        applyLevel(config.mode)
    }

    function stop() {
        for (const mod of modules) stopModule(mod)
    }

    function setMode(mode) {
        config.mode = mode
        applyLevel(mode)
    }

    function getMode() {
        return config.mode
    }

    return { register, start, stop, setMode, getMode }
}
