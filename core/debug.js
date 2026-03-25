const COUNTER_KEYS = [
    'interceptedTasks',
    'delayedTasks',
    'rafCalls',
    'blockedAnimations',
    'throttledEvents',
    'mutationsBatched',
    'mutationsObserved',
    'eventsSkipped',
]

function zeroCounters() {
    return Object.fromEntries(COUNTER_KEYS.map(k => [k, 0]))
}

export function createDebugModule() {
    let counters = zeroCounters()
    let enabled = false

    function start(config) {
        enabled = config.debug === true
        counters = zeroCounters()
    }

    function stop() {
        counters = zeroCounters()
        enabled = false
    }

    function increment(key) {
        if (key in counters) counters[key]++
    }

    function stats() {
        return { ...counters }
    }

    return {
        name: 'debug',
        minLevel: 1,
        start,
        stop,
        increment,
        stats,
    }
}
