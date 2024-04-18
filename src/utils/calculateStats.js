export const StatTypes = ['normalized', 'mean', 'median', 'standardDeviation', 'zScore', 'min', 'max']
export function makeCalculateStats(historySize = 500) {
    let history = [];

    function addValue(value) {
        if (history.length >= historySize) {
            history.shift();  // Remove the oldest value to maintain size
        }
        history.push(value);
    }

    function calculateMean() {
        return history.reduce((sum, val) => sum + val, 0) / history.length;
    }

    function calculateMedian() {
        if (history.length === 0) return null;
        const sortedHistory = [...history].sort((a, b) => a - b);
        const mid = Math.floor(sortedHistory.length / 2);
        return sortedHistory.length % 2 !== 0 ? sortedHistory[mid] : (sortedHistory[mid - 1] + sortedHistory[mid]) / 2;
    }

    function calculateMin() {
        return Math.min(...history);
    }

    function calculateMax() {
        return Math.max(...history);
    }

    function calculateStandardDeviation(mean) {
        return Math.sqrt(history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length);
    }

    return function calculateStats(value) {
        if (typeof value !== 'number') throw new Error('Input must be a number');

        addValue(value);

        const mean = calculateMean();
        const median = calculateMedian();
        const min = calculateMin();
        const max = calculateMax();
        const standardDeviation = calculateStandardDeviation(mean);

        return {
            current: value,
            mean,
            median,
            min,
            max,
            standardDeviation
        };
    };
}
