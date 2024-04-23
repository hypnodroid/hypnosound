export const StatTypes = ['normalized', 'mean', 'median', 'standardDeviation', 'zScore', 'min', 'max']

export function makeCalculateStats(historySize = 500) {
    let queue = []
    let sum = 0
    let sumOfSquares = 0
    let minQueue = []
    let maxQueue = []
    let lowerHalf = [] // Max heap
    let upperHalf = [] // Min heap

    function updateMinMaxQueues(value) {
        while (minQueue.length && minQueue[minQueue.length - 1] > value) {
            minQueue.pop()
        }
        while (maxQueue.length && maxQueue[maxQueue.length - 1] < value) {
            maxQueue.pop()
        }
        minQueue.push(value)
        maxQueue.push(value)
    }

    function removeOldFromMinMaxQueues(oldValue) {
        if (minQueue[0] === oldValue) {
            minQueue.shift()
        }
        if (maxQueue[0] === oldValue) {
            maxQueue.shift()
        }
    }

    function addNumberToHeaps(number) {
        if (lowerHalf.length === 0 || number < lowerHalf[0]) {
            lowerHalf.push(number)
            bubbleUp(lowerHalf, false)
        } else {
            upperHalf.push(number)
            bubbleUp(upperHalf, true)
        }
        rebalanceHeaps()
    }

    function rebalanceHeaps() {
        while (lowerHalf.length > upperHalf.length + 1) {
            upperHalf.push(extractTop(lowerHalf, false))
            bubbleUp(upperHalf, true)
        }
        while (upperHalf.length > lowerHalf.length) {
            lowerHalf.push(extractTop(upperHalf, true))
            bubbleUp(lowerHalf, false)
        }
    }

    function removeNumberFromHeaps(number) {
        if (lowerHalf.includes(number)) {
            removeNumber(lowerHalf, number, false)
        } else if (upperHalf.includes(number)) {
            removeNumber(upperHalf, number, true)
        }
        rebalanceHeaps()
    }

    // Bubble up and sink down functions remain the same...

    function calculateMedian() {
        if (lowerHalf.length === upperHalf.length) {
            return lowerHalf.length ? (lowerHalf[0] + upperHalf[0]) / 2 : 0
        } else {
            return lowerHalf[0]
        }
    }

    // calculateMAD and medianAbsoluteDeviation functions remain the same...

    return function calculateStats(value) {
        if (typeof value !== 'number') throw new Error('Input must be a number')

        updateMinMaxQueues(value)
        addNumberToHeaps(value)

        queue.push(value)
        sum += value
        sumOfSquares += value * value

        if (queue.length > historySize) {
            let removed = queue.shift()
            sum -= removed
            sumOfSquares -= removed * removed
            removeOldFromMinMaxQueues(removed)
            removeNumberFromHeaps(removed)
        }

        let mean = queue.length ? sum / queue.length : 0
        let variance = queue.length ? sumOfSquares / queue.length - mean * mean : 0
        let min = minQueue.length ? minQueue[0] : 0
        let max = maxQueue.length ? maxQueue[0] : 0
        let median = calculateMedian()
        let mad = calculateMAD(median)

        return {
            current: value,
            zScore: (variance ? (value - mean) / Math.sqrt(variance) : 0) / 6,
            normalized: mad, // Using MAD normalization as 'normalized'
            standardDeviation: Math.sqrt(variance),
            median,
            mean,
            min,
            max,
        }
    }
}
