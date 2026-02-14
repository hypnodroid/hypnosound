export default function energy(fft) {
    return calculateFFTEnergy(fft)
}

function calculateFFTEnergy(currentSignal) {
    let energy = 0

    for (let i = 0; i < currentSignal.length; i++) {
        let normalizedValue = currentSignal[i] / 255 // Normalize Uint8Array (0-255) to 0-1
        energy += normalizedValue * normalizedValue // Sum the squares of the normalized values
    }

    // Normalize by the number of samples so result is in 0-1 range
    energy = energy / currentSignal.length

    return energy
}
