export const StatTypes = ['normalized', 'mean', 'median', 'standardDeviation', 'zScore', 'min', 'max']

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

const bubbleUp = (heap, isMinHeap) => {
    let index = heap.length - 1
    const value = heap[index]

    while (index > 0) {
        const parentIdx = Math.floor((index - 1) / 2)
        const shouldSwap = isMinHeap ? heap[index] < heap[parentIdx] : heap[index] > heap[parentIdx]

        if (!shouldSwap) break

        heap[index] = heap[parentIdx]
        index = parentIdx
    }

    heap[index] = value
}

const getBestChildIndex = (heap, leftChildIndex, rightChildIndex, isMinHeap) => {
    if (rightChildIndex >= heap.length) return leftChildIndex

    const comparator = isMinHeap ? Math.min : Math.max
    return comparator(heap[leftChildIndex], heap[rightChildIndex]) === heap[leftChildIndex] ? leftChildIndex : rightChildIndex
}

const sinkDown = (heap, isMinHeap) => {
    let index = 0
    const value = heap[0]
    const length = heap.length

    while (true) {
        const leftChildIndex = 2 * index + 1
        if (leftChildIndex >= length) break

        const bestChildIndex = getBestChildIndex(heap, leftChildIndex, 2 * index + 2, isMinHeap)
        const shouldSwap = isMinHeap ? heap[bestChildIndex] < value : heap[bestChildIndex] > value

        if (!shouldSwap) break

        heap[index] = heap[bestChildIndex]
        index = bestChildIndex
    }

    heap[index] = value
}

export const makeCalculateStats = (historySize = 500) => {
    const queue = []
    const minQueue = new MonotonicQueue(true)
    const maxQueue = new MonotonicQueue(false)
    const lowerHalf = [] // Max heap
    const upperHalf = [] // Min heap

    let sum = 0
    let sumOfSquares = 0

    const getTargetHeap = (value) => {
        if (lowerHalf.length === 0 || value < lowerHalf[0]) return { target: lowerHalf, isMin: false }
        return { target: upperHalf, isMin: true }
    }

    const addToHeaps = (value) => {
        const heap = getTargetHeap(value)
        heap.target.push(value)
        bubbleUp(heap.target, heap.isMin)
        rebalanceHeaps()
    }

    const removeNumberFromHeaps = (number) => {
        if (lowerHalf.includes(number)) {
            const index = lowerHalf.indexOf(number)
            lowerHalf[index] = lowerHalf[lowerHalf.length - 1]
            lowerHalf.pop()
            sinkDown(lowerHalf, false)
        } else if (upperHalf.includes(number)) {
            const index = upperHalf.indexOf(number)
            upperHalf[index] = upperHalf[upperHalf.length - 1]
            upperHalf.pop()
            sinkDown(upperHalf, true)
        }
        rebalanceHeaps()
    }

    const rebalanceHeaps = () => {
        if (lowerHalf.length <= upperHalf.length + 1 && upperHalf.length <= lowerHalf.length) return

        if (lowerHalf.length > upperHalf.length + 1) {
            const value = extractTop(lowerHalf)
            upperHalf.push(value)
            bubbleUp(upperHalf, true)
            return
        }

        const value = extractTop(upperHalf)
        lowerHalf.push(value)
        bubbleUp(lowerHalf, false)
    }

    const extractTop = (heap) => {
        if (!heap.length) return null
        const top = heap[0]
        heap[0] = heap[heap.length - 1]
        heap.pop()
        sinkDown(heap, heap === upperHalf)
        return top
    }

    const calculateMedian = () => {
        if (!lowerHalf.length) return queue[0] || 0
        if (lowerHalf.length === upperHalf.length) return (lowerHalf[0] + upperHalf[0]) / 2
        return lowerHalf[0]
    }

    const calculate = (value) => {
        if (typeof value !== 'number' || isNaN(value)) throw new Error('Input must be a valid number')

        minQueue.push(value)
        maxQueue.push(value)
        addToHeaps(value)
        queue.push(value)

        sum += value
        sumOfSquares += value * value

        if (queue.length > historySize) {
            const removed = queue.shift()
            sum -= removed
            sumOfSquares -= removed * removed
            minQueue.remove(removed)
            maxQueue.remove(removed)
            removeNumberFromHeaps(removed)
        }

        const mean = sum / queue.length
        const variance = Math.max(0, sumOfSquares / queue.length - mean * mean)
        const min = minQueue.peek() || 0
        const max = maxQueue.peek() || 0

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
        }
    }

    calculate.queue = queue
    return calculate
}
