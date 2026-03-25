const FPS_TARGETS = { conservative: 60, balanced: 30, aggressive: 20, ultra: 15 }

export function createSchedulerModule(debug) {
    let _setTimeout = null
    let _requestAnimationFrame = null
    let config = {}
    let lastRafTime = 0

    function getTargetFps() {
        return FPS_TARGETS[config.mode] ?? 60
    }

    function patchSetTimeout() {
        _setTimeout = window.setTimeout
        if (!_setTimeout) return

        window.setTimeout = function (fn, delay, ...args) {
            debug?.increment('interceptedTasks')
            return _setTimeout.call(window, fn, delay, ...args)
        }
    }

    function patchRaf() {
        _requestAnimationFrame = window.requestAnimationFrame
        if (!_requestAnimationFrame) return

        window.requestAnimationFrame = function (callback) {
            debug?.increment('rafCalls')

            const targetInterval = 1000 / getTargetFps()
            const now = performance.now()

            if (now - lastRafTime < targetInterval) {
                return _requestAnimationFrame.call(window, (timestamp) => {
                    lastRafTime = timestamp
                    callback(timestamp)
                })
            }

            lastRafTime = now
            return _requestAnimationFrame.call(window, callback)
        }
    }

    function start(cfg) {
        config = cfg
        patchSetTimeout()
        patchRaf()
    }

    function stop() {
        if (_setTimeout) {
            window.setTimeout = _setTimeout
            _setTimeout = null
        }
        if (_requestAnimationFrame) {
            window.requestAnimationFrame = _requestAnimationFrame
            _requestAnimationFrame = null
        }
        lastRafTime = 0
    }

    return { name: 'scheduler', minLevel: 1, start, stop }
}
