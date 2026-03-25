import { createDomModule } from '../core/dom.js'

let dom
let debug

beforeEach(() => {
    debug = { increment: vi.fn() }
    dom = createDomModule(debug)
    // Clear DOM
    document.body.innerHTML = ''
})

afterEach(() => {
    dom.stop()
})

test('module shape is correct', () => {
    expect(dom.name).toBe('dom')
    expect(dom.minLevel).toBe(2)
})

test('start monkey-patches Element.prototype.appendChild', () => {
    const original = Element.prototype.appendChild
    dom.start({ mode: 'balanced', debug: false })
    expect(Element.prototype.appendChild).not.toBe(original)
})

test('stop restores Element.prototype.appendChild', () => {
    const original = Element.prototype.appendChild
    dom.start({ mode: 'balanced', debug: false })
    dom.stop()
    expect(Element.prototype.appendChild).toBe(original)
})

test('appendChild in conservative mode works immediately', () => {
    dom.start({ mode: 'conservative', debug: false })
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    expect(parent.contains(child)).toBe(true)
})

test('appendChild in balanced mode queues and flushes at rAF', async () => {
    dom.start({ mode: 'balanced', debug: false })
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    // In balanced mode, mutation is queued, not immediately applied
    // After flushing, child should be added
    await new Promise(resolve => requestAnimationFrame(resolve))
    expect(parent.contains(child)).toBe(true)
})

test('debug.increment is called for batched mutations', () => {
    dom.start({ mode: 'balanced', debug: true })
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    expect(debug.increment).toHaveBeenCalledWith('mutationsBatched')
})

test('MutationObserver runs in parallel', (done) => {
    dom.start({ mode: 'balanced', debug: false })
    const parent = document.createElement('div')
    const child = document.createElement('span')
    setTimeout(() => {
        parent.appendChild(child)
        // Check that observer counted the mutation
        setTimeout(() => {
            expect(debug.increment).toHaveBeenCalledWith('mutationsObserved')
            done()
        }, 50)
    }, 10)
})

test('user interaction flushes batched mutations immediately', (done) => {
    dom.start({ mode: 'balanced', debug: false })
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    // Simulate click
    document.dispatchEvent(new MouseEvent('click'))
    setTimeout(() => {
        expect(parent.contains(child)).toBe(true)
        done()
    }, 10)
})
