# hypnosound
A little library for extracting audio features, and optionally applying statistics to them.

## Usage
Check out [index.html](./index.html) for a simple example. You can run it via `npm run start`.

You can either use the AudioProcessor, which maintains state and calculates the statistics for you, or use of the functions directly in a functional way. Everything can be used functionally except for spectralFlux, which requires state.

### AudioProcessor

```javascript
  import AudioProcessor from 'hypnosound';
  const a = new AudioProcessor();
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
  });

  ```

  Each audio feature comes with statistics, which are calculated automatically. You can access them like so:
  ```javascript
  const {value, stats} = a.energy(fft)
  console.log(`the current value for energy is ${value}`);
  console.log(`here are some stats: zScore: ${stats.zScore}, normalized: ${stats.normalized}, standardDeviation: ${stats.standardDeviation}, median: ${stats.median}, mean: ${stats.mean}, min: ${stats.min}, max: ${stats.max}`);
  ```
⚠️ __Warning: Each call to a function will update the statistics for that feature. so I'd recommend saving the result of the function call to a variable and then use that__

### Functional
```javascript
import {energy} from 'hypnosound'; // or any other audio feature EXCEPT spectralFlux
console.log(energy(fft)); // returns the instantaneous energy value.
```

You may want to calculate statistics for the audio features on your own, but still use the functional style.
Since statistics require state, this must be managed outside the function in purely functional mode.
Here's an example of how you might do that:

```javascript
import { makeCalculateStats, spectralCentroid } from 'hypnosound'
const calculateStats = makeCalculateStats()

const value = spectralCentroid(fft)
const stats = calculateStats(value) // WARNING: each call to calculateStats will update the state.

console.log({value, stats})
```


