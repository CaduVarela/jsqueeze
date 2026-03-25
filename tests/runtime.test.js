import { createRuntime } from '../core/runtime.js'

let runtime

beforeEach(() => {
    runtime = createRuntime()
})

test('getMode returns conservative by default', () => {
    runtime.start()
    expect(runtime.getMode()).toBe('conservative')
})

test('start accepts a custom mode', () => {
    runtime.start({ mode: 'ultra' })
    expect(runtime.getMode()).toBe('ultra')
})

test('setMode changes the active mode', () => {
    runtime.start()
    runtime.setMode('aggressive')
    expect(runtime.getMode()).toBe('aggressive')
})

test('registered module with minLevel 1 is started at conservative', () => {
    const mod = { name: 'test', minLevel: 1, start: vi.fn(), stop: vi.fn() }
    runtime.register(mod)
    runtime.start({ mode: 'conservative' })
    expect(mod.start).toHaveBeenCalledOnce()
})

test('registered module with minLevel 3 is NOT started at conservative', () => {
    const mod = { name: 'test', minLevel: 3, start: vi.fn(), stop: vi.fn() }
    runtime.register(mod)
    runtime.start({ mode: 'conservative' })
    expect(mod.start).not.toHaveBeenCalled()
})

test('registered module with minLevel 3 IS started at aggressive', () => {
    const mod = { name: 'test', minLevel: 3, start: vi.fn(), stop: vi.fn() }
    runtime.register(mod)
    runtime.start({ mode: 'aggressive' })
    expect(mod.start).toHaveBeenCalledOnce()
})

test('stop calls stop on all active modules', () => {
    const mod = { name: 'test', minLevel: 1, start: vi.fn(), stop: vi.fn() }
    runtime.register(mod)
    runtime.start()
    runtime.stop()
    expect(mod.stop).toHaveBeenCalledOnce()
})

test('setMode starts newly eligible modules', () => {
    const mod = { name: 'test', minLevel: 3, start: vi.fn(), stop: vi.fn() }
    runtime.register(mod)
    runtime.start({ mode: 'conservative' })
    runtime.setMode('aggressive')
    expect(mod.start).toHaveBeenCalledOnce()
})

test('setMode stops modules no longer eligible', () => {
    const mod = { name: 'test', minLevel: 3, start: vi.fn(), stop: vi.fn() }
    runtime.register(mod)
    runtime.start({ mode: 'aggressive' })
    runtime.setMode('conservative')
    expect(mod.stop).toHaveBeenCalledOnce()
})
