# hypnosound

A little library for extracting audio features, and optionally applying statistics to them.

## Usage

Check out [index.html](./index.html) for a simple example. You can run it via `npm run start`.

You can either use the AudioProcessor, which maintains state and calculates the statistics for you, or use of the functions directly in a functional way. Everything can be used functionally except for spectralFlux, which requires state.

### AudioProcessor

```javascript
import AudioProcessor from 'hypnosound'
const a = new AudioProcessor()
console.log({
    energy: a.energy(fft),
    spectralCentroid: a.spectralCentroid(fft),
    spectralCrest: a.spectralCrest(fft),
    spectralEntropy: a.spectralEntropy(fft),
    spectralFlux: a.spectralFlux(fft),
    spectralKurtosis: a.spectralKurtosis(fft),
    spectralRolloff: a.spectralRolloff(fft),
    spectralRoughness: a.spectralRoughness(fft),
    spectralSkew: a.spectralSkew(fft),
    spectralSpread: a.spectralSpread(fft),
})
```

Each audio feature comes with statistics, which are calculated automatically. You can access them like so:

```javascript
const { value, stats } = a.energy(fft)
console.log(`the current value for energy is ${value}`)
console.log(
    `here are some stats: zScore: ${stats.zScore}, normalized: ${stats.normalized}, standardDeviation: ${stats.standardDeviation}, median: ${stats.median}, mean: ${stats.mean}, min: ${stats.min}, max: ${stats.max}`,
)
```

⚠️ **Warning: Each call to a function will update the statistics for that feature. so I'd recommend saving the result of the function call to a variable and then use that**

### Functional

```javascript
import { energy } from 'hypnosound' // or any other audio feature EXCEPT spectralFlux
console.log(energy(fft)) // returns the instantaneous energy value.
```

You may want to calculate statistics for the audio features on your own, but still use the functional style.
Since statistics require state, this must be managed outside the function in purely functional mode.
Here's an example of how you might do that:

```javascript
import { makeCalculateStats, spectralCentroid } from 'hypnosound'
const calculateStats = makeCalculateStats()

const value = spectralCentroid(fft)
const stats = calculateStats(value) // WARNING: each call to calculateStats will update the state.

console.log({ value, stats })
```

## Output ranges

Ranges below are **empirically measured**, not declared — produced by
`scripts/test/feature-ranges.mjs`, which drives every feature over ten synthetic 1024-bin
spectra (silence, full scale, half scale, deterministic noise, low/mid/high single tones,
ramps up and down, and a sparse comb) for 30 frames each and records the observed
minimum and maximum. Run it yourself to reproduce.

These are **observations, not guarantees**. Real audio may fall outside them, and several
features are not 0–1 despite what you might reasonably assume.

| feature | observed min | observed max | notes |
| --- | --- | --- | --- |
| `energy` | 0 | 1 | 0–1 since 1.14.0; was `×65.025` larger before |
| `rms` | 0 | 1 | |
| `dbfs` | 0 | 1 | normalized, with a −100 dB floor clamped to 0 |
| `bass` | 0 | **0.0625** | never approaches 1, even at full scale |
| `mids` | 0 | 1 | |
| `treble` | 0 | 1 | |
| `spectralCentroid` | 0 | **1.32** | **exceeds 1** |
| `spectralCrest` | 0 | **100** | **not 0–1** |
| `spectralEntropy` | 0 | 1 | |
| `spectralFlux` | 0 | 2.61 | see the warning below |
| `spectralKurtosis` | 0.470 | 0.802 | narrow; never reaches 0 or 1 |
| `spectralRolloff` | 0 | 0.922 | |
| `spectralRoughness` | 0 | 0.923 | |
| `spectralSkew` | 0.499 | 0.832 | narrow; never reaches 0 or 1 |
| `spectralSpread` | 0 | 0.588 | |
| `pitchClass` | 0 | 0.917 | quantized to twelfths (`n / 12`) |

Three of these are worth calling out explicitly, because assuming 0–1 will bite you:

- **`spectralCrest` is 0–100**, not 0–1. Divide by 100 if you need a unit range.
- **`spectralCentroid` can exceed 1** — 1.32 observed on a high single tone.
- **`bass` tops out at 0.0625** (`1/16`) on a full-scale spectrum, so it is not comparable
  in magnitude to `mids` or `treble`. `bass`/`mids`/`treble` derive their bin ranges from
  `sampleRate / fft.length`, which is off by 2× from the real bin spacing
  (`sampleRate / (2 × fft.length)` for a spectrum of `fft.length` bins).

`spectralKurtosis` and `spectralSkew` never approach either end of 0–1, so if you are
mapping them to a visual parameter, rescale from their real span rather than from 0–1.

### ⚠️ `spectralFlux` through `AudioProcessor` is broken

`AudioProcessor.spectralFlux()` **throws on roughly half of all calls** (measured: 135
throws in 300). `spectralFlux(fft, prev)` indexes `prev` as an array, but `AudioProcessor`
passes the previous scalar return value, producing `NaN` — which `makeCalculateStats()`
rejects with `Input must be a valid number`. The stored `NaN` then makes the next frame
compare against a zero-filled array, so successful calls return roughly triple the correct
value (~1.29 versus ~0.43) and are not measuring flux at all.

Use the functional form and keep the previous **spectrum** yourself:

```javascript
import { spectralFlux } from 'hypnosound'

let previousFft = null
function onFrame(fft) {
    const flux = previousFft ? spectralFlux(fft, previousFft) : 0
    previousFft = fft.slice()   // copy: getByteFrequencyData reuses its buffer
    return flux
}
```
