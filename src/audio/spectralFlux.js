export default function spectralFlux(prevValue, statCalculator, fft) {
        const value = calculateSpectralFlux(fft, prevValue)
        const stats = statCalculator(value)
        return { value, stats }
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
    return sf / 30_000
}
