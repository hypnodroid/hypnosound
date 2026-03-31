export default function bandEnergy(fft, lowHz, highHz, sampleRate = 44100) {
    const frequencyResolution = sampleRate / fft.length
    let bandPower = 0
    let totalPower = 0

    for (let i = 0; i < fft.length; i++) {
        const frequency = i * frequencyResolution
        const magnitude = fft[i] / 255
        const power = magnitude * magnitude
        totalPower += power
        if (frequency >= lowHz && frequency <= highHz) {
            bandPower += power
        }
    }

    return totalPower > 0 ? bandPower / totalPower : 0
}
