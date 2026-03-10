export default function bass(fft, sampleRate = 44100) {
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
        // Normalize each FFT value from 0 to 1 (assuming Uint8Array values 0-255)
        let magnitude = fft[i] / 255
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
