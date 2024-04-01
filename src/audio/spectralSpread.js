import mu from '../utils/mu.js'
export default function spectralSpread(fft) {
    const value = calculateSpectralSpread(fft) // Process FFT data
    return value
}

function calculateMaxSpread(fftSize) {
    // Create a spectrum with energy at the two extremes
    const extremeSpectrum = new Array(fftSize).fill(0)
    extremeSpectrum[0] = 1 // Energy at the lowest frequency
    extremeSpectrum[fftSize - 1] = 1 // Energy at the highest frequency

    const meanFrequency = mu(1, extremeSpectrum)
    const secondMoment = mu(2, extremeSpectrum)

    return Math.sqrt(secondMoment - Math.pow(meanFrequency, 2))
}

function calculateSpectralSpread(fftData) {
    const meanFrequency = mu(1, fftData)
    const secondMoment = mu(2, fftData)
    const maxSpread = calculateMaxSpread(fftData.length)
    const spread = Math.sqrt(secondMoment - Math.pow(meanFrequency, 2))
    // Normalize the spread
    return spread / maxSpread
}
