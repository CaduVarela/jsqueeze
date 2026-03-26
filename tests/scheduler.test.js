import { createSchedulerModule } from '../core/scheduler.js'
import { createWorkersModule } from '../core/workers.js'

let scheduler
let debug

beforeEach(() => {
    debug = { increment: vi.fn(), stats: vi.fn() }
    scheduler = createSchedulerModule(debug)
    vi.useFakeTimers()
})

afterEach(() => {
    scheduler.stop()
    vi.useRealTimers()
})

test('module shape is correct', () => {
    expect(scheduler.name).toBe('scheduler')
    expect(scheduler.minLevel).toBe(1)
})

test('start monkey-patches window.setTimeout', () => {
    const original = window.setTimeout
    scheduler.start({ mode: 'conservative', debug: false })
    expect(window.setTimeout).not.toBe(original)
})

test('stop restores window.setTimeout', () => {
    const original = window.setTimeout
    scheduler.start({ mode: 'conservative', debug: false })
    scheduler.stop()
    expect(window.setTimeout).toBe(original)
})

test('setTimeout callbacks still execute after patching', () => {
    scheduler.start({ mode: 'conservative', debug: false })
    const fn = vi.fn()
    window.setTimeout(fn, 100)
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledOnce()
})

test('debug.increment is called for intercepted tasks', () => {
    scheduler.start({ mode: 'conservative', debug: true })
    window.setTimeout(() => {}, 100)
    expect(debug.increment).toHaveBeenCalledWith('interceptedTasks')
})

test('start monkey-patches window.requestAnimationFrame', () => {
    const original = window.requestAnimationFrame
    scheduler.start({ mode: 'conservative', debug: false })
    expect(window.requestAnimationFrame).not.toBe(original)
})

test('stop restores window.requestAnimationFrame', () => {
    const original = window.requestAnimationFrame
    scheduler.start({ mode: 'conservative', debug: false })
    scheduler.stop()
    expect(window.requestAnimationFrame).toBe(original)
})

test('scheduler offloads long tasks to worker pool', () => {
    // Mock the Worker class to avoid initialization errors in test environment
    class MockWorker {
        constructor() {
            this.onmessage = null
        }
        postMessage() {}
        terminate() {}
    }
    global.Worker = MockWorker

    const debugObj = { increment: vi.fn() }
    const testScheduler = createSchedulerModule(debugObj)
    const workers = createWorkersModule(debugObj)

    testScheduler.start({ mode: 'aggressive', debug: false })
    workers.start({ mode: 'aggressive', debug: false })

    testScheduler.setWorkersModule(workers)

    const longTask = () => {
        let sum = 0
        for (let i = 0; i < 10000000; i++) sum += i
        return sum
    }

    testScheduler.queue(longTask, 'low')

    expect(testScheduler.getQueueLength()).toBeGreaterThan(0)

    workers.stop()
    testScheduler.stop()
})
