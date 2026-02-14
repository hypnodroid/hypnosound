export default function spectralFlatness(fft) {
    if (!fft.length) return 0

    const n = fft.length
    let sumLog = 0
    let sum = 0
    let nonZeroCount = 0

    for (let i = 0; i < n; i++) {
        const power = fft[i] * fft[i]
        sum += power
        if (power > 0) {
            sumLog += Math.log(power)
            nonZeroCount++
        }
    }

    if (sum === 0 || nonZeroCount === 0) return 0

    const arithmeticMean = sum / n
    // Geometric mean via exp(mean of logs)
    // Use nonZeroCount for the log average to avoid -Infinity from zeros
    // but use n for arithmetic mean (standard definition)
    const geometricMean = Math.exp(sumLog / n)

    const flatness = geometricMean / arithmeticMean

    // Clamp to [0, 1] (should be naturally in this range but floating point)
    return Math.max(0, Math.min(1, isNaN(flatness) ? 0 : flatness))
}
