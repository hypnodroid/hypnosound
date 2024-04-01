export default function energy(statCalculator, fft) {
    const value = calculateFFTEnergy(fft)
    const stats = statCalculator(value)
    return { value, stats }
}

function calculateFFTEnergy(currentSignal) {
    let energy = 0
    for (let i = 0; i < currentSignal.length; i++) {
        let normalizedValue = currentSignal[i] / currentSignal.length
        energy += normalizedValue * normalizedValue
    }

    return energy * 10
}
