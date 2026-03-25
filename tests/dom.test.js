import { createDomModule } from '../core/dom.js'

let dom
let debug

beforeEach(() => {
    debug = { increment: vi.fn() }
    dom = createDomModule(debug)
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
    dom.start({})
    expect(Element.prototype.appendChild).not.toBe(original)
})

test('stop restores Element.prototype.appendChild', () => {
    const original = Element.prototype.appendChild
    dom.start({})
    dom.stop()
    expect(Element.prototype.appendChild).toBe(original)
})

test('appendChild executes immediately', () => {
    dom.start({})
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    expect(parent.contains(child)).toBe(true)
})

test('insertBefore executes immediately', () => {
    dom.start({})
    const parent = document.createElement('div')
    const child1 = document.createElement('span')
    const child2 = document.createElement('span')
    parent.appendChild(child1)
    parent.insertBefore(child2, child1)
    expect(parent.firstChild).toBe(child2)
})

test('removeChild executes immediately', () => {
    dom.start({})
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    parent.removeChild(child)
    expect(parent.contains(child)).toBe(false)
})

test('debug.increment is called for mutations', () => {
    dom.start({})
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    expect(debug.increment).toHaveBeenCalledWith('mutationsBatched')
})
