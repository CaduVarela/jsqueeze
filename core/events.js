const MONITORED_EVENTS = new Set(['scroll', 'resize', 'mousemove', 'touchmove'])

const SKIP_FRAMES_PER_LEVEL = {
    conservative: 0,
    balanced: 0,       // Sync with rAF, no skip
    aggressive: 1,     // Skip every other frame
    ultra: 2,          // Skip 2 frames
}

export function createEventsModule(debug) {
    let _addEventListener = null
    let _removeEventListener = null
    let config = {}
    const listenerMap = new WeakMap()
    const frameCounters = new Map()

    function shouldThrottle(eventType) {
        return MONITORED_EVENTS.has(eventType)
    }

    function getSkipFrames() {
        return SKIP_FRAMES_PER_LEVEL[config.mode] ?? 0
    }

    function createThrottledCallback(eventType, originalCallback) {
        let frameCounter = frameCounters.get(eventType) ?? 0
        const skipFrames = getSkipFrames()

        return function throttledCallback(event) {
            frameCounter = (frameCounter + 1) % (skipFrames + 1)
            if (frameCounter !== 0) {
                if (debug) debug.increment('eventsSkipped')
                return
            }
            originalCallback.call(this, event)
        }
    }

    function patchAddEventListener() {
        _addEventListener = EventTarget.prototype.addEventListener
        EventTarget.prototype.addEventListener = function (type, listener, options) {
            if (!shouldThrottle(type) || config.mode === 'conservative') {
                return _addEventListener.call(this, type, listener, options)
            }

            const throttled = createThrottledCallback(type, listener)
            if (!listenerMap.has(listener)) {
                listenerMap.set(listener, new Map())
            }
            listenerMap.get(listener).set(type, throttled)

            if (debug) debug.increment('throttledEvents')
            return _addEventListener.call(this, type, throttled, options)
        }
    }

    function patchRemoveEventListener() {
        _removeEventListener = EventTarget.prototype.removeEventListener
        EventTarget.prototype.removeEventListener = function (type, listener, options) {
            if (!shouldThrottle(type) || config.mode === 'conservative') {
                return _removeEventListener.call(this, type, listener, options)
            }

            const throttledMap = listenerMap.get(listener)
            if (throttledMap && throttledMap.has(type)) {
                const throttled = throttledMap.get(type)
                throttledMap.delete(type)
                if (throttledMap.size === 0) {
                    listenerMap.delete(listener)
                }
                return _removeEventListener.call(this, type, throttled, options)
            }

            return _removeEventListener.call(this, type, listener, options)
        }
    }

    function start(cfg) {
        config = cfg
        patchAddEventListener()
        patchRemoveEventListener()
    }

    function stop() {
        if (_addEventListener) EventTarget.prototype.addEventListener = _addEventListener
        if (_removeEventListener) EventTarget.prototype.removeEventListener = _removeEventListener
    }

    return { name: 'events', minLevel: 2, start, stop }
}
