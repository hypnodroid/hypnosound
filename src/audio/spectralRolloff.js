export default function spectralRolloff(fft) {
    const value = calculateSpectralRolloff(fft) // Compute Spectral Rolloff
    return value
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
