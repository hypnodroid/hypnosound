export default function spectralSkew(fft) {
    const computed = calculateSpectralSkewness(fft) || 0 // Process FFT data
    const value = computed / 10
    return value
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
