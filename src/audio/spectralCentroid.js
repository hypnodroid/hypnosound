export default function spectralCentroid(fft) {
    const computed = calculateSpectralCentroid(fft) // Process FFT data
    return computed ?? 0
}
function calculateSpectralCentroid(ampSpectrum) {
    if (!ampSpectrum.length) return null // Early exit if the spectrum is empty

    let numerator = 0
    let denominator = 0

    // Calculate the weighted sum (numerator) and the sum of the amplitudes (denominator)
    ampSpectrum.forEach((amplitude, index) => {
        numerator += index * amplitude
        denominator += amplitude
    })

    // Avoid dividing by zero
    if (denominator === 0) return null

    const centroidIndex = numerator / denominator
    // Normalize the centroid index to be between 0 and 1
    const normalizedCentroid = centroidIndex / (ampSpectrum.length - 1)

    return normalizedCentroid
}
