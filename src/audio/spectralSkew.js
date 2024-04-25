export default function spectralSkew(fft) {
    const computed = calculateSpectralSkewness(fft) || 0 // Process FFT data
    // Adjust the steepness factor (k) based on expected skewness range
    const k = 0.05 // Decrease this value if skewness values are large
    // Apply a logistic function to map the result to (0, 1)
    const value = 1 / (1 + Math.exp(-k * computed))
    return value
}

function calculateSpectralSkewness(fftData) {
    if (fftData.length === 0) {
        return 0 // Guard against division by zero if fftData is empty
    }

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
