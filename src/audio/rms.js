export default function rms(fft) {
    let sumOfSquares = 0
    for (let i = 0; i < fft.length; i++) {
        const normalized = fft[i] / 255
        sumOfSquares += normalized * normalized
    }
    return Math.sqrt(sumOfSquares / fft.length)
}
