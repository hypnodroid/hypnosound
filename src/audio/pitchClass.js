export default function pitchClass(fft) {
    // Constants for the FFT processing
    const sampleRate = 44100 // This could vary
    const fftSize = fft.length // This is an example, adjust based on your FFT setup
    if (fftSize === 0) return 0 // Early exit if FFT data is empty
    const freqResolution = sampleRate / fftSize

    // Finding the dominant frequency in the FFT data
    let maxIndex = 0
    let maxValue = 0
    for (let i = 0; i < fft.length; i++) {
        if (typeof fft[i] !== 'number' || isNaN(fft[i])) continue // Skip non-numeric or NaN values
        if (fft[i] > maxValue) {
            maxValue = fft[i]
            maxIndex = i
        }
    }
    const dominantFreq = maxIndex * freqResolution
    if (dominantFreq === 0) return 0 // Return default if no frequency is found

    // Convert to MIDI note then to pitch class
    const midiNote = 69 + 12 * Math.log2(dominantFreq / 440)
    const pitchClass = midiNote % 12

    // Normalize to a 0-1 range
    const normalizedpitchClass = pitchClass / 12
    return normalizedpitchClass
}
