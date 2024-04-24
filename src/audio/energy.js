export default function energy(fft) {
    return calculateFFTEnergy(fft)
}

function calculateFFTEnergy(currentSignal) {
    let energy = 0
    for (let i = 0; i < currentSignal.length; i++) {
        let normalizedValue = currentSignal[i] / currentSignal.length
        energy += normalizedValue * normalizedValue
    }

    return energy * 2
}
