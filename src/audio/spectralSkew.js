export default function spectralSkew(prevValue, statCalculator, fft) {
    const computed = calculateSpectralSkewness(fft) || 0 // Process FFT data
    const value = computed / 10.
    const stats = statCalculator(value)
    return { value, stats }
}

function mu(i, amplitudeSpect) {
    let numerator = 0
    let denominator = 0

    for (let k = 0; k < amplitudeSpect.length; k++) {
        numerator += Math.pow(k, i) * Math.abs(amplitudeSpect[k])
        denominator += amplitudeSpect[k]
    }

    if (denominator === 0) return null // Prevent division by zero
    return numerator / denominator
}

function calculateSpectralSkewness(fftData) {
    const mean = fftData.reduce((sum, val) => sum + val, 0) / fftData.length
    const variance = fftData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / fftData.length
    const standardDeviation = Math.sqrt(variance)

    let skewness = 0
    if (standardDeviation !== 0) {
        skewness = fftData.reduce((sum, val) => sum + Math.pow(val - mean, 3), 0) / fftData.length
        skewness /= Math.pow(standardDeviation, 3)
    }

    return skewness
}
