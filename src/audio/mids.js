export default function mids(fft) {
    const sampleRate = 44100
    const totalSamples = fft.length
    return calculateMidPower(fft, sampleRate, totalSamples)
}

function calculateMidPower(fft, sampleRate, totalSamples) {
    const lowerBound = 400 // 400 Hz
    const upperBound = 4000 // 4000 Hz
    let midEnergy = 0
    let maxEnergy = 0

    // Calculate frequency resolution
    const frequencyResolution = sampleRate / totalSamples

    for (let i = 0; i < fft.length; i++) {
        let frequency = i * frequencyResolution
        let magnitude = Math.abs(fft[i]) / totalSamples
        let power = magnitude * magnitude

        // Accumulate max energy for normalization
        maxEnergy += power

        // Isolate and accumulate mid frequencies
        if (frequency >= lowerBound && frequency <= upperBound) {
            midEnergy += power
        }
    }

    // Normalize mid energy from 0 to 1
    let normalizedMidPower = midEnergy / maxEnergy
    return isNaN(normalizedMidPower) ? 0 : normalizedMidPower // Scale by 10 if needed, similar to your original function
}
