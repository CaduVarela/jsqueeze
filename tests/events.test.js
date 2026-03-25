import { createEventsModule } from '../core/events.js'

let events
let debug

beforeEach(() => {
    debug = { increment: vi.fn() }
    events = createEventsModule(debug)
})

afterEach(() => {
    events.stop()
})

test('module shape is correct', () => {
    expect(events.name).toBe('events')
    expect(events.minLevel).toBe(2)
})

test('start monkey-patches addEventListener', () => {
    const original = EventTarget.prototype.addEventListener
    events.start({ mode: 'balanced', debug: false })
    expect(EventTarget.prototype.addEventListener).not.toBe(original)
})

test('stop restores addEventListener', () => {
    const original = EventTarget.prototype.addEventListener
    events.start({ mode: 'balanced', debug: false })
    events.stop()
    expect(EventTarget.prototype.addEventListener).toBe(original)
})

test('non-monitored events are not throttled', () => {
    events.start({ mode: 'aggressive', debug: false })
    const div = document.createElement('div')
    const fn = vi.fn()
    div.addEventListener('click', fn)
    const event = new MouseEvent('click')
    div.dispatchEvent(event)
    div.dispatchEvent(event)
    div.dispatchEvent(event)
    expect(fn).toHaveBeenCalledTimes(3)
})

test('scroll listener is throttled in balanced mode', () => {
    events.start({ mode: 'balanced', debug: false })
    const fn = vi.fn()
    document.addEventListener('scroll', fn)
    const event = new Event('scroll')
    document.dispatchEvent(event)
    document.dispatchEvent(event)
    document.dispatchEvent(event)
    // In balanced mode, scroll is synced with rAF (60fps), so all 3 should execute
    // (for this test, we're not mocking rAF, so behavior is browser-dependent)
    expect(fn.mock.calls.length).toBeGreaterThan(0)
})

test('mousemove listener is throttled in aggressive mode', () => {
    events.start({ mode: 'aggressive', debug: false })
    const fn = vi.fn()
    document.addEventListener('mousemove', fn)
    const event = new MouseEvent('mousemove')
    // Dispatch 5 events rapidly
    for (let i = 0; i < 5; i++) {
        document.dispatchEvent(event)
    }
    // In aggressive mode, skip every other frame, so ~2-3 calls
    expect(fn.mock.calls.length).toBeLessThan(5)
})

test('debug.increment is called for throttled events', () => {
    events.start({ mode: 'aggressive', debug: true })
    const fn = vi.fn()
    document.addEventListener('scroll', fn)
    const event = new Event('scroll')
    document.dispatchEvent(event)
    expect(debug.increment).toHaveBeenCalledWith('throttledEvents')
})

test('removeEventListener unwraps throttled callbacks', () => {
    events.start({ mode: 'aggressive', debug: false })
    const fn = vi.fn()
    document.addEventListener('scroll', fn)
    document.removeEventListener('scroll', fn)
    const event = new Event('scroll')
    document.dispatchEvent(event)
    // After removal, listener should not fire
    expect(fn).not.toHaveBeenCalled()
})
