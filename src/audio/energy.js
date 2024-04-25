export default function energy(fft) {
    return calculateFFTEnergy(fft) / 1000
}

function calculateFFTEnergy(currentSignal) {
    let energy = 0
    const maxPossibleValue = 1 // This should be 1 if your data is normalized between 0 and 1
    const maxPossibleEnergy = currentSignal.length // Total samples if each sample was at maximum value

    for (let i = 0; i < currentSignal.length; i++) {
        let normalizedValue = currentSignal[i] / maxPossibleValue // Normalize each FFT value
        energy += normalizedValue * normalizedValue // Sum the squares of the normalized values
    }

    // Normalize the computed energy by the number of samples since each sample's max energy would be 1 if maxPossibleValue is 1
    energy = energy / currentSignal.length

    return energy
}
