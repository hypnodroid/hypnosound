export default function energy(fft) {
    let sum = 0
    for (let i = 0; i < fft.length; i++) {
        const normalized = fft[i] / 255
        sum += normalized * normalized
    }
    return sum / fft.length
}
