export default function spectralKurtosis(prevValue,statCalculator, fft) {
    let computed = calculateSpectralKurtosis(fft) // Process FFT data
    const value = computed * 100
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
function calculateSpectralKurtosis(fftData) {
    const mean = mu(1, fftData)
    const secondMoment = mu(2, fftData)
    const variance = secondMoment - Math.pow(mean, 2)

    let fourthMoment = 0
    for (let i = 0; i < fftData.length; i++) {
        fourthMoment += Math.pow(fftData[i] - mean, 4)
    }
    fourthMoment /= fftData.length

    // Add a small epsilon to the denominator to prevent gigantic scores when variance is very small
    const epsilon = 1e-7 // Adjust epsilon based on the scale of your data
    const kurtosis = variance ? fourthMoment / Math.pow(variance + epsilon, 2) - 3 : 0
    if (kurtosis > 3000) return 0
    return kurtosis / 3000
}
