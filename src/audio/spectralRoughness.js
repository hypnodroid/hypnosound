export default function spectralRoughness(prevValue, statCalculator, fft) {
    let computed = calculateSpectralRoughness(fft) // Process FFT data
    const value = computed/100_000
    const stats = statCalculator(value)
    return { value, stats }
}

function calculateSpectralRoughness(fftData) {
    let roughness = 0

    for (let i = 1; i < fftData.length; i++) {
        // Calculate the difference in amplitude between adjacent frequency bins
        let diff = Math.abs(fftData[i] - fftData[i - 1])
        roughness += diff
    }

    return roughness
}
