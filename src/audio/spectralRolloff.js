export default function spectralRolloff(prevValue, statCalculator, fft) {
    const value = calculateSpectralRolloff(fft) // Compute Spectral Rolloff
    const stats = statCalculator(value)
    return { value, stats }
}

// Calculate Spectral Rolloff
function calculateSpectralRolloff(fftData, threshold = 0.85) {
    let totalEnergy = fftData.reduce((acc, val) => acc + val, 0)
    let energyThreshold = totalEnergy * threshold
    let cumulativeEnergy = 0

    for (let i = 0; i < fftData.length; i++) {
        cumulativeEnergy += fftData[i]
        if (cumulativeEnergy >= energyThreshold) {
            return i / fftData.length // Normalized rolloff frequency
        }
    }

    return 0 // In case the threshold is not met
}
