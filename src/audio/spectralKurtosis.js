import mu from '../utils/mu.js'

export default function spectralKurtosis(fft) {
    const computed = calculateSpectralKurtosis(fft) // Process FFT data
    // Normalize using a logistic function
    const k = 0.05 // Adjust k based on the expected range of kurtosis values
    const value = 1 / (1 + Math.exp(-k * computed))
    return value
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

    // Add a small epsilon to the denominator to prevent division by a very small number
    const epsilon = 1e-7 // Adjust epsilon based on the scale of your data
    const kurtosis = variance ? fourthMoment / Math.pow(variance + epsilon, 2) - 3 : 0
    return kurtosis
}
