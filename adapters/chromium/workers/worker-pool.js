self.onmessage = function(event) {
    const { taskId, type, code, data } = event.data

    try {
        if (type === 'compute') {
            const fn = eval(`(${code})`)
            const result = fn(...Object.values(data))
            self.postMessage({ taskId, result })
        } else if (type === 'execute') {
            const fn = eval(`(${code})`)
            const result = fn()
            self.postMessage({ taskId, result })
        }
    } catch (error) {
        self.postMessage({ taskId, error: error.message })
    }
}
