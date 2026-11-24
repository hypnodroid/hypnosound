export const StatTypes = ['normalized', 'mean', 'median', 'standardDeviation', 'zScore', 'min', 'max', 'slope', 'intercept', 'rSquared']

const erf = (x) => {
    const a1 = 0.254829592
    const a2 = -0.284496736
    const a3 = 1.421413741
    const a4 = -1.453152027
    const a5 = 1.061405429
    const p = 0.3275911

    const sign = x < 0 ? -1 : 1
    x = Math.abs(x)

    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

    return sign * y
}

class MonotonicQueue {
    constructor(isMin = true) {
        this.deque = []
        this.compare = isMin ? (a, b) => a > b : (a, b) => a < b
    }

    push(value) {
        while (this.deque.length && this.compare(this.deque[this.deque.length - 1], value)) {
            this.deque.pop()
        }
        this.deque.push(value)
    }

    remove(value) {
        if (!this.deque.length || this.deque[0] !== value) return
        this.deque.shift()
    }

    peek = () => this.deque[0]
}

// Two-heap rolling median. Each heap entry is a node { value, heap, index } that
// knows where it sits, so the value leaving the window is removed in O(log n)
// from its own slot instead of being searched for.
const outranks = (heap, a, b) => (heap.isMin ? a.value < b.value : a.value > b.value)

const place = (heap, node, index) => {
    heap[index] = node
    node.index = index
}

const siftUp = (heap, index) => {
    const node = heap[index]
    while (index > 0) {
        const parentIndex = (index - 1) >> 1
        if (!outranks(heap, node, heap[parentIndex])) break
        place(heap, heap[parentIndex], index)
        index = parentIndex
    }
    place(heap, node, index)
}

const siftDown = (heap, index) => {
    const node = heap[index]
    const length = heap.length
    while (true) {
        const left = 2 * index + 1
        if (left >= length) break
        const right = left + 1
        const best = right < length && outranks(heap, heap[right], heap[left]) ? right : left
        if (!outranks(heap, heap[best], node)) break
        place(heap, heap[best], index)
        index = best
    }
    place(heap, node, index)
}

const pushNode = (heap, node) => {
    node.heap = heap
    place(heap, node, heap.length)
    siftUp(heap, node.index)
}

// Removes the node from whatever slot it occupies. The last node fills the hole and
// may belong above or below it, so the heap property is restored from that slot in
// both directions.
const removeNode = (heap, node) => {
    const last = heap.pop()
    if (last === node) return
    place(heap, last, node.index)
    siftUp(heap, last.index)
    siftDown(heap, last.index)
}

const popTop = (heap) => {
    const top = heap[0]
    removeNode(heap, top)
    return top
}

export const makeCalculateStats = (historySize = 500) => {
    const queue = []
    const minQueue = new MonotonicQueue(true)
    const maxQueue = new MonotonicQueue(false)
    const lowerHalf = Object.assign([], { isMin: false }) // max heap: the smaller half
    const upperHalf = Object.assign([], { isMin: true }) // min heap: the larger half
    const nodes = [] // heap nodes in arrival order, parallel to queue

    let sum = 0
    let sumOfSquares = 0

    // Keeps lowerHalf.length equal to upperHalf.length or one more
    const rebalanceHeaps = () => {
        if (lowerHalf.length > upperHalf.length + 1) return pushNode(upperHalf, popTop(lowerHalf))
        if (upperHalf.length > lowerHalf.length) pushNode(lowerHalf, popTop(upperHalf))
    }

    const addToHeaps = (value) => {
        const node = { value, heap: null, index: -1 }
        pushNode(lowerHalf.length && value > lowerHalf[0].value ? upperHalf : lowerHalf, node)
        rebalanceHeaps()
        return node
    }

    const removeFromHeaps = (node) => {
        removeNode(node.heap, node)
        rebalanceHeaps()
    }

    const calculateMedian = () => {
        if (!lowerHalf.length) return 0
        if (lowerHalf.length === upperHalf.length) return (lowerHalf[0].value + upperHalf[0].value) / 2
        return lowerHalf[0].value
    }

    // Calculate linear regression using least squares method
    // Uses indices 0 to n-1 as x values, queue values as y values
    const calculateLinearRegression = (mean) => {
        const n = queue.length
        if (n < 2) return { slope: 0, intercept: mean, rSquared: 0 }

        // For x = 0, 1, 2, ..., n-1:
        // sumX = n*(n-1)/2
        // sumXX = n*(n-1)*(2n-1)/6
        const sumX = (n * (n - 1)) / 2
        const sumXX = (n * (n - 1) * (2 * n - 1)) / 6

        // Calculate sumXY = sum of (i * queue[i])
        let sumXYCalc = 0
        for (let i = 0; i < n; i++) {
            sumXYCalc += i * queue[i]
        }

        const denominator = n * sumXX - sumX * sumX
        if (denominator === 0) return { slope: 0, intercept: mean, rSquared: 0 }

        const slope = (n * sumXYCalc - sumX * sum) / denominator
        const intercept = (sum - slope * sumX) / n

        // Calculate R-squared (coefficient of determination)
        let ssRes = 0  // Sum of squared residuals
        let ssTot = 0  // Total sum of squares
        for (let i = 0; i < n; i++) {
            const predicted = slope * i + intercept
            ssRes += (queue[i] - predicted) ** 2
            ssTot += (queue[i] - mean) ** 2
        }

        const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot

        return { slope, intercept, rSquared }
    }

    const calculate = (value) => {
        if (typeof value !== 'number' || isNaN(value)) throw new Error('Input must be a valid number')

        minQueue.push(value)
        maxQueue.push(value)
        nodes.push(addToHeaps(value))
        queue.push(value)

        sum += value
        sumOfSquares += value * value

        if (queue.length > historySize) {
            const removed = queue.shift()
            sum -= removed
            sumOfSquares -= removed * removed
            minQueue.remove(removed)
            maxQueue.remove(removed)
            removeFromHeaps(nodes.shift())
        }

        const mean = sum / queue.length
        const variance = Math.max(0, sumOfSquares / queue.length - mean * mean)
        const min = minQueue.peek() || 0
        const max = maxQueue.peek() || 0

        const regression = calculateLinearRegression(mean)

        if (max === min) {
            return {
                current: value,
                zScore: 1,
                normalized: 0.5,
                standardDeviation: 0,
                median: value,
                mean,
                min,
                max,
                slope: regression.slope,
                intercept: regression.intercept,
                rSquared: regression.rSquared,
            }
        }

        const stdDev = Math.sqrt(variance)
        return {
            current: value,
            zScore: stdDev > 0 ? (value - mean) / (stdDev * 2.5) : 0,
            normalized: (value - min) / (max - min),
            standardDeviation: stdDev,
            median: calculateMedian(),
            mean,
            min,
            max,
            slope: regression.slope,
            intercept: regression.intercept,
            rSquared: regression.rSquared,
        }
    }

    calculate.queue = queue
    return calculate
}
