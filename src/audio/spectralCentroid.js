import mu from '../utils/mu.js'
export default function spectralCentroid(fft) {
    const computed = calculateSpectralCentroid(fft) // Process FFT data
    return computed * 1.5
}

function calculateSpectralCentroid(ampSpectrum) {
    const centroid = mu(1, ampSpectrum)
    if (centroid === null) return null

    // Maximum centroid occurs when all energy is at the highest frequency bin
    const maxCentroid = mu(
        1,
        ampSpectrum.map((val, index) => (index === ampSpectrum.length - 1 ? 1 : 0)),
    )
    return centroid / maxCentroid // Normalize the centroid
}
