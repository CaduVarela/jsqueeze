import { createRuntime } from './runtime.js'
import { createDebugModule } from './debug.js'
import { createSchedulerModule } from './scheduler.js'
import { createAnimationModule } from './animation.js'
import { createDomModule } from './dom.js'
import { createEventsModule } from './events.js'

const debugModule = createDebugModule()
const runtime = createRuntime()

runtime.register(debugModule)
runtime.register(createSchedulerModule(debugModule))
runtime.register(createAnimationModule(debugModule))
runtime.register(createDomModule(debugModule))
runtime.register(createEventsModule(debugModule))

export const JSqueeze = {
    start(opts = {}) {
        runtime.start(opts)
    },
    stop() {
        runtime.stop()
    },
    setMode(mode) {
        runtime.setMode(mode)
    },
    getMode() {
        return runtime.getMode()
    },
    stats() {
        return debugModule.stats()
    },
}
