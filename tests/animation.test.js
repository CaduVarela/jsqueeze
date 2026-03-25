import { createAnimationModule } from '../core/animation.js'

let animation
let debug

beforeEach(() => {
    debug = { increment: vi.fn() }
    animation = createAnimationModule(debug)
    document.querySelectorAll('#jsqueeze-animation-style').forEach(el => el.remove())
})

afterEach(() => {
    animation.stop()
})

test('module shape is correct', () => {
    expect(animation.name).toBe('animation')
    expect(animation.minLevel).toBe(3)
})

test('start injects a style tag into the document', () => {
    animation.start({ mode: 'aggressive', debug: false })
    expect(document.getElementById('jsqueeze-animation-style')).not.toBeNull()
})

test('stop removes the injected style tag', () => {
    animation.start({ mode: 'aggressive', debug: false })
    animation.stop()
    expect(document.getElementById('jsqueeze-animation-style')).toBeNull()
})

test('aggressive mode injects transition reduction CSS', () => {
    animation.start({ mode: 'aggressive', debug: false })
    const style = document.getElementById('jsqueeze-animation-style')
    expect(style.textContent).toContain('transition-duration')
})

test('ultra mode injects animation + transition disable CSS', () => {
    animation.start({ mode: 'ultra', debug: false })
    const style = document.getElementById('jsqueeze-animation-style')
    expect(style.textContent).toContain('animation: none')
    expect(style.textContent).toContain('transition: none')
})

test('debug.increment is called for blocked animations on ultra', () => {
    animation.start({ mode: 'ultra', debug: true })
    expect(debug.increment).toHaveBeenCalledWith('blockedAnimations')
})
