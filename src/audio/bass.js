import normalizeInput from '../utils/normalizeInput.js'

export default function bass(fft) {
    const sampleRate = 44100
    const totalSamples = fft.length
    return calculateBassPower(normalizeInput(fft), sampleRate, totalSamples)
}

function calculateBassPower(normalized, sampleRate, totalSamples) {
    const lowerBound = 0
    const upperBound = 400
    let bassEnergy = 0
    let maxEnergy = 0

    // Calculate frequency resolution
    const frequencyResolution = sampleRate / totalSamples

    for (let i = 0; i < normalized.length; i++) {
        let frequency = i * frequencyResolution
        let magnitude = normalized[i]
        let power = magnitude * magnitude

        // Accumulate max energy for normalization
        maxEnergy += power

        // Isolate and accumulate bass frequencies
        if (frequency >= lowerBound && frequency <= upperBound) {
            bassEnergy += power
        }
    }

    // Normalize bass energy from 0 to 1
    let normalizedBassPower = maxEnergy > 0 ? bassEnergy / maxEnergy : 0
    return isNaN(normalizedBassPower) ? 0 : normalizedBassPower
}
