export default function bass(fft) {
    const sampleRate = 44100
    const totalSamples = fft.length
    return calculateBassPower(fft, sampleRate, totalSamples)
}

function calculateBassPower(fft, sampleRate, totalSamples) {
    const lowerBound = 0
    const upperBound = 400
    let bassEnergy = 0
    let maxEnergy = 0

    // Calculate frequency resolution
    const frequencyResolution = sampleRate / totalSamples

    for (let i = 0; i < fft.length; i++) {
        let frequency = i * frequencyResolution
        let magnitude = Math.abs(fft[i]) / totalSamples
        let power = magnitude * magnitude

        // Accumulate max energy for normalization
        maxEnergy += power

        // Isolate and accumulate bass frequencies
        if (frequency >= lowerBound && frequency <= upperBound) {
            bassEnergy += power
        }
    }
    // Normalize bass energy from 0 to 1
    let normalizedBassPower = bassEnergy / maxEnergy
    return isNaN(normalizedBassPower) ? 0 : normalizedBassPower // Scale by 10 if needed, similar to your original function
}
