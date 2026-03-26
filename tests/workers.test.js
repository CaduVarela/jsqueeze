import { createWorkerPool } from '../core/workers.js'

// Mock Web Worker API since jsdom doesn't support it
class MockWorker {
    constructor() {
        this.onmessage = null
    }

    postMessage(data) {
        // Simulate worker execution after a brief delay
        if (data.type === 'compute') {
            const fn = eval(`(${data.code})`)
            const result = fn(...Object.values(data.data))
            setTimeout(() => {
                if (this.onmessage) {
                    this.onmessage({
                        data: {
                            taskId: data.id,
                            result: result
                        }
                    })
                }
            }, 0)
        } else if (data.type === 'execute') {
            const fn = eval(`(${data.code})`)
            const result = fn()
            setTimeout(() => {
                if (this.onmessage) {
                    this.onmessage({
                        data: {
                            taskId: data.id,
                            result: result
                        }
                    })
                }
            }, 0)
        }
    }

    terminate() {
        // No-op for mock
    }
}

beforeEach(() => {
    global.Worker = MockWorker
})

test('worker pool initializes with correct number of workers', async () => {
    const pool = createWorkerPool({ workerCount: 4 })
    expect(pool.getAvailableWorkerCount()).toBe(4)
    pool.terminate()
})

test('worker pool executes task and returns result', async () => {
    const pool = createWorkerPool({ workerCount: 2 })
    const result = await pool.run({
        type: 'compute',
        data: { x: 5, y: 3 },
        code: '(x, y) => x + y'
    })
    expect(result).toBe(8)
    pool.terminate()
})
