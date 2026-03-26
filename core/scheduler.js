const FPS_TARGETS = { conservative: 60, balanced: 30, aggressive: 20, ultra: 15 }

export function createSchedulerModule(debug) {
    let _setTimeout = null
    let _requestAnimationFrame = null
    let config = {}
    let lastRafTime = 0
    let taskQueue = []
    let workers = null

    function getTargetFps() {
        return FPS_TARGETS[config.mode] ?? 60
    }

    function setWorkersModule(workersModule) {
        workers = workersModule
    }

    function executeTask(task) {
        const startTime = performance.now()

        try {
            const result = task.fn()
            const duration = performance.now() - startTime

            if (duration > 50 && workers && task.priority === 'low') {
                workers.offloadIfNeeded(task.fn, duration)
            }

            if (debug) debug.increment('interceptedTasks')
            return result
        } catch (e) {
            console.error('Task execution error:', e)
        }
    }

    function queue(fn, priority = 'normal') {
        taskQueue.push({ fn, priority })
    }

    function getQueueLength() {
        return taskQueue.length
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
        taskQueue = []
    }

    return { name: 'scheduler', minLevel: 1, start, stop, setWorkersModule, queue, getQueueLength, executeTask }
}
