export default function pitchClass(fft) {
    const sampleRate = 44100
    // Constants for the FFT processing
    const fftSize = fft.length
    const freqResolution = sampleRate / fftSize

    // Finding the dominant frequency in the FFT data
    let maxIndex = 0
    let maxValue = 0
    for (let i = 1; i < fft.length; i++) {
        // start from 1 to skip DC offset
        if (fft[i] > maxValue) {
            maxValue = fft[i]
            maxIndex = i
        }
    }
    const dominantFreq = maxIndex * freqResolution

    // Convert to MIDI note then to pitchClass
    const midiNote = 69 + 12 * Math.log2(dominantFreq / 440)
    const pitchClass = Math.round(midiNote) % 12 // round to reduce minor fluctuation effects

    // Normalize to a 0-1 range
    const normalizedpitchClass = pitchClass / 12

    return isNaN(normalizedpitchClass) ? 0 : normalizedpitchClass
}
