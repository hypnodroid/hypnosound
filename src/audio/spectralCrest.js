export default function spectralCrest(prevValue,statCalculator, fft) {
    let computed = calculateSpectralCrest(fft) // Process FFT data
    const value = computed * 100
    const stats = statCalculator(value)
    return { value, stats }
}

function calculateSpectralCrest(fftData) {
    // Find the maximum amplitude in the spectrum
    const maxAmplitude = Math.max(...fftData)

    // Calculate the sum of all amplitudes
    const sumAmplitudes = fftData.reduce((sum, amplitude) => sum + amplitude, 0)

    // Calculate the Spectral Crest
    const spectralCrest = sumAmplitudes !== 0 ? maxAmplitude / sumAmplitudes : 0

    return spectralCrest
}
