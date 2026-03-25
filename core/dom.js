const MONITORED_EVENTS = ['click', 'scroll', 'keypress', 'touchstart', 'mousedown']

export function createDomModule(debug) {
    let _appendChild = null
    let _insertBefore = null
    let _removeChild = null
    let _setInnerHTML = null
    let _setTextContent = null
    let mutationObserver = null
    let config = {}
    let mutationQueue = []
    let rafId = null
    let timeoutId = null

    function queueMutation(fn) {
        mutationQueue.push(fn)
        scheduleFlush()
    }

    function scheduleFlush() {
        if (rafId !== null) return

        if (config.mode === 'conservative') {
            flushMutations()
        } else {
            rafId = requestAnimationFrame(() => {
                flushMutations()
                rafId = null
            })

            // Safeguard: force flush after 100ms if mutations still queued
            if (timeoutId !== null) clearTimeout(timeoutId)
            timeoutId = setTimeout(() => {
                if (mutationQueue.length > 0) {
                    if (rafId !== null) cancelAnimationFrame(rafId)
                    flushMutations()
                    rafId = null
                }
                timeoutId = null
            }, 100)
        }
    }

    function flushMutations() {
        if (mutationQueue.length === 0) return
        const toFlush = [...mutationQueue]
        mutationQueue = []
        for (const fn of toFlush) {
            try {
                fn()
            } catch (e) {
                console.error('Error flushing mutation:', e)
            }
        }
        if (debug) {
            debug.increment('batchCount')
        }
    }

    function setupMutationObserver() {
        mutationObserver = new MutationObserver((mutations) => {
            if (debug) {
                debug.increment('mutationsObserved', mutations.length)
            }
        })
        mutationObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false,
        })
    }

    function setupInteractionListeners() {
        const flush = () => {
            if (mutationQueue.length > 0) {
                if (rafId !== null) cancelAnimationFrame(rafId)
                if (timeoutId !== null) clearTimeout(timeoutId)
                flushMutations()
                rafId = null
                timeoutId = null
            }
        }
        MONITORED_EVENTS.forEach(evt => {
            document.addEventListener(evt, flush, { passive: true })
        })
    }

    function patchAppendChild() {
        _appendChild = Element.prototype.appendChild
        Element.prototype.appendChild = function (child) {
            if (config.mode === 'conservative') {
                return _appendChild.call(this, child)
            }
            queueMutation(() => {
                _appendChild.call(this, child)
            })
            if (debug) debug.increment('mutationsBatched')
            return child
        }
    }

    function patchInsertBefore() {
        _insertBefore = Element.prototype.insertBefore
        Element.prototype.insertBefore = function (newNode, refNode) {
            if (config.mode === 'conservative') {
                return _insertBefore.call(this, newNode, refNode)
            }
            queueMutation(() => {
                _insertBefore.call(this, newNode, refNode)
            })
            if (debug) debug.increment('mutationsBatched')
            return newNode
        }
    }

    function patchRemoveChild() {
        _removeChild = Element.prototype.removeChild
        Element.prototype.removeChild = function (child) {
            if (config.mode === 'conservative') {
                return _removeChild.call(this, child)
            }
            queueMutation(() => {
                _removeChild.call(this, child)
            })
            if (debug) debug.increment('mutationsBatched')
            return child
        }
    }

    function patchInnerHTML() {
        const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')
        if (!descriptor) return
        _setInnerHTML = descriptor.set
        Object.defineProperty(Element.prototype, 'innerHTML', {
            set: function (html) {
                if (config.mode === 'conservative') {
                    _setInnerHTML.call(this, html)
                    return
                }
                queueMutation(() => {
                    _setInnerHTML.call(this, html)
                })
                if (debug) debug.increment('mutationsBatched')
            },
            get: descriptor.get,
        })
    }

    function patchTextContent() {
        const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'textContent')
        if (!descriptor) return
        _setTextContent = descriptor.set
        Object.defineProperty(Element.prototype, 'textContent', {
            set: function (text) {
                if (config.mode === 'conservative') {
                    _setTextContent.call(this, text)
                    return
                }
                queueMutation(() => {
                    _setTextContent.call(this, text)
                })
                if (debug) debug.increment('mutationsBatched')
            },
            get: descriptor.get,
        })
    }

    function start(cfg) {
        config = cfg
        patchAppendChild()
        patchInsertBefore()
        patchRemoveChild()
        patchInnerHTML()
        patchTextContent()
        setupMutationObserver()
        setupInteractionListeners()
    }

    function stop() {
        if (_appendChild) Element.prototype.appendChild = _appendChild
        if (_insertBefore) Element.prototype.insertBefore = _insertBefore
        if (_removeChild) Element.prototype.removeChild = _removeChild
        if (mutationObserver) mutationObserver.disconnect()
        if (rafId !== null) cancelAnimationFrame(rafId)
        if (timeoutId !== null) clearTimeout(timeoutId)
        flushMutations()
        mutationQueue = []
    }

    return { name: 'dom', minLevel: 2, start, stop }
}
