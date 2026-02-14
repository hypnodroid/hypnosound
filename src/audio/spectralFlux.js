export default function spectralFlux(fft, prevValue) {
    const value = calculateSpectralFlux(fft, prevValue)
    return value / (255 * fft.length)
}

function calculateSpectralFlux(currentSignal, previousSignal) {
    if (!previousSignal) {
        previousSignal = new Float32Array(currentSignal.length)
    }

    let sf = 0
    for (let i = 0; i < currentSignal.length; i++) {
        const diff = Math.abs(currentSignal[i]) - Math.abs(previousSignal[i])
        sf += (diff + Math.abs(diff)) / 2
    }
    return sf
}
