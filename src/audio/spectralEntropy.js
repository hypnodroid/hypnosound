export default function spectralEntropy(prevValue,statCalculator, fft) {
    let computed = calculateSpectralEntropy(fft) // Process FFT data
    const value = computed
    const stats = statCalculator(value)
    return { value, stats }
}

function toPowerSpectrum(fftData) {
    return fftData.map((amplitude) => Math.pow(amplitude, 2))
}

function calculateSpectralEntropy(fftData) {
    const powerSpectrum = toPowerSpectrum(fftData)

    // Normalize the power spectrum to create a probability distribution
    const totalPower = powerSpectrum.reduce((sum, val) => sum + val, 0)
    const probabilityDistribution = powerSpectrum.map((val) => val / totalPower)

    // Calculate the entropy
    const entropy = probabilityDistribution.reduce((sum, prob) => {
        return prob > 0 ? sum - prob * Math.log(prob) : sum
    }, 0)

    return entropy / Math.log(probabilityDistribution.length)
}
