import { createDebugModule } from '../core/debug.js'

let debug

beforeEach(() => {
    debug = createDebugModule()
})

test('stats returns zeroed object before start', () => {
    expect(debug.stats()).toEqual({
        interceptedTasks: 0,
        delayedTasks: 0,
        rafCalls: 0,
        blockedAnimations: 0,
        throttledEvents: 0,
        mutationsBatched: 0,
        mutationsObserved: 0,
        eventsSkipped: 0,
        workerTasksOffloaded: 0,
        workerTasksCompleted: 0,
    })
})

test('increment increases the correct counter', () => {
    debug.increment('interceptedTasks')
    debug.increment('interceptedTasks')
    debug.increment('rafCalls')
    expect(debug.stats().interceptedTasks).toBe(2)
    expect(debug.stats().rafCalls).toBe(1)
})

test('stop resets all counters', () => {
    debug.increment('interceptedTasks')
    debug.stop()
    expect(debug.stats().interceptedTasks).toBe(0)
})

test('module shape has name and minLevel', () => {
    expect(debug.name).toBe('debug')
    expect(debug.minLevel).toBe(1)
})
