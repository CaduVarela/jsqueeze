export function createWorkerPool(config = {}) {
    const { workerCount = 4, debug = null } = config
    const workers = []
    const taskQueue = []
    const activeTasks = new Map()
    let availableWorkers = 0
    let nextWorkerIndex = 0

    function initializeWorkers() {
        // Worker code as string to avoid CORS issues
        const workerCode = `
            self.onmessage = function(event) {
                const { taskId, type, code, data } = event.data
                try {
                    if (type === 'compute') {
                        const fn = eval(\`(\${code})\`)
                        const result = fn(...Object.values(data))
                        self.postMessage({ taskId, result })
                    } else if (type === 'execute') {
                        const fn = eval(\`(\${code})\`)
                        const result = fn()
                        self.postMessage({ taskId, result })
                    }
                } catch (error) {
                    self.postMessage({ taskId, error: error.message })
                }
            }
        `

        // Create Blob URL to avoid CORS restrictions
        const blob = new Blob([workerCode], { type: 'application/javascript' })
        const workerUrl = URL.createObjectURL(blob)

        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker(workerUrl)
            worker.onmessage = handleWorkerMessage
            workers.push(worker)
        }
        availableWorkers = workerCount
    }

    function handleWorkerMessage(event) {
        const { taskId, result, error } = event.data
        const task = activeTasks.get(taskId)
        if (task) {
            if (error) {
                task.reject(new Error(error))
            } else {
                task.resolve(result)
            }
            if (debug) debug.increment('workerTasksCompleted')
            activeTasks.delete(taskId)
            availableWorkers++
        }
        processQueue()
    }

    function processQueue() {
        if (taskQueue.length > 0 && availableWorkers > 0) {
            const task = taskQueue.shift()
            const workerIdx = nextWorkerIndex % workerCount
            nextWorkerIndex++
            const worker = workers[workerIdx]
            availableWorkers--
            activeTasks.set(task.id, task)
            worker.postMessage(task)
        }
    }

    function run(task) {
        return new Promise((resolve, reject) => {
            const taskId = Math.random()
            taskQueue.push({
                ...task,
                id: taskId,
                resolve,
                reject
            })
            processQueue()
        })
    }

    function getAvailableWorkerCount() {
        return availableWorkers
    }

    function getPoolState() {
        return {
            availableWorkers,
            tasksInQueue: taskQueue.length,
            activeWorkers: activeTasks.size,
            totalWorkers: workerCount
        }
    }

    function terminate() {
        workers.forEach(w => w.terminate())
    }

    initializeWorkers()

    return {
        run,
        getAvailableWorkerCount,
        getPoolState,
        terminate
    }
}

export function createWorkersModule(debug) {
    let workerPool = null
    let config = {}

    function start(cfg) {
        config = cfg
        const threshold = getThresholdForMode(config.mode)
        workerPool = createWorkerPool({
            workerCount: 4,
            threshold,
            debug
        })
    }

    function getThresholdForMode(mode) {
        const thresholds = {
            conservative: Infinity,
            balanced: 100,
            aggressive: 50,
            ultra: 10
        }
        return thresholds[mode] || Infinity
    }

    function stop() {
        if (workerPool) {
            workerPool.terminate()
            workerPool = null
        }
    }

    function offloadIfNeeded(fn, taskDuration) {
        const threshold = getThresholdForMode(config.mode)
        if (taskDuration > threshold && workerPool) {
            if (debug) debug.increment('workerTasksOffloaded')
            return workerPool.run({
                type: 'execute',
                fn: fn.toString()
            })
        }
        return null
    }

    function getWorkerPoolState() {
        if (workerPool) {
            return workerPool.getPoolState()
        }
        return null
    }

    return {
        name: 'workers',
        minLevel: 2,
        start,
        stop,
        offloadIfNeeded,
        getWorkerPoolState
    }
}
