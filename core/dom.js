export function createDomModule(debug) {
    let _appendChild = null
    let _insertBefore = null
    let _removeChild = null
    let _setInnerHTML = null
    let _setTextContent = null
    let mutationObserver = null
    let config = {}

    function setupMutationObserver() {
        mutationObserver = new MutationObserver((mutations) => {
            if (debug) {
                debug.increment('mutationsObserved')
            }
        })
        mutationObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false,
        })
    }

    function patchAppendChild() {
        _appendChild = Element.prototype.appendChild
        Element.prototype.appendChild = function (child) {
            if (debug) debug.increment('mutationsBatched')
            return _appendChild.call(this, child)
        }
    }

    function patchInsertBefore() {
        _insertBefore = Element.prototype.insertBefore
        Element.prototype.insertBefore = function (newNode, refNode) {
            if (debug) debug.increment('mutationsBatched')
            return _insertBefore.call(this, newNode, refNode)
        }
    }

    function patchRemoveChild() {
        _removeChild = Element.prototype.removeChild
        Element.prototype.removeChild = function (child) {
            if (debug) debug.increment('mutationsBatched')
            return _removeChild.call(this, child)
        }
    }

    function patchInnerHTML() {
        const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')
        if (!descriptor) return
        _setInnerHTML = descriptor.set
        Object.defineProperty(Element.prototype, 'innerHTML', {
            set: function (html) {
                if (debug) debug.increment('mutationsBatched')
                _setInnerHTML.call(this, html)
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
                if (debug) debug.increment('mutationsBatched')
                _setTextContent.call(this, text)
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
    }

    function stop() {
        if (_appendChild) Element.prototype.appendChild = _appendChild
        if (_insertBefore) Element.prototype.insertBefore = _insertBefore
        if (_removeChild) Element.prototype.removeChild = _removeChild
        if (mutationObserver) mutationObserver.disconnect()
    }

    return { name: 'dom', minLevel: 2, start, stop }
}
