export default function chromagram(fft, sampleRate = 44100) {
    const chroma = new Float32Array(12) // one bin per pitch class (C, C#, D, ..., B)
    const freqResolution = sampleRate / fft.length

    for (let i = 1; i < fft.length; i++) {
        const frequency = i * freqResolution
        if (frequency < 20 || frequency > 20000) continue // skip sub-audible and ultrasonic

        const midiNote = 69 + 12 * Math.log2(frequency / 440)
        const pitchClass = Math.round(midiNote) % 12
        const normalizedPitchClass = ((pitchClass % 12) + 12) % 12 // ensure positive

        chroma[normalizedPitchClass] += fft[i] * fft[i] // accumulate energy (power)
    }

    // Normalize: divide by max so strongest pitch class = 1
    const maxEnergy = Math.max(...chroma)
    if (maxEnergy > 0) {
        for (let i = 0; i < 12; i++) {
            chroma[i] /= maxEnergy
        }
    }

    return chroma
}
