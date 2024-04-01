export default function spectralRoughness(fft) {
    const value = calculateSpectralRoughness(fft) // Process FFT data
    return value / 100_000
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
