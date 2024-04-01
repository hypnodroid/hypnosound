export default function spectralCrest(fft) {
    const computed = calculateSpectralCrest(fft) // Process FFT data
    return computed * 100
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
