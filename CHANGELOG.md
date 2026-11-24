# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) **as of
2.0.0**. Earlier releases did not — see the note under 2.0.0.

## [2.0.0] — unreleased

**No code changed between `1.14.0` and `2.0.0`.** This release exists to label, under
semantic versioning, two breaking changes that were already published as *minor* bumps
without documentation. If you are already on `1.14.0`, upgrading to `2.0.0` changes
nothing about how this library behaves.

The break is relative to **`1.13.0` and earlier**.

### BREAKING — `energy()` output scale changed by 65.025× (shipped in 1.14.0)

The computation changed from summing squares of raw 0–255 byte values with an arbitrary
divisor, to normalizing each bin to 0–1 first:

```js
// 1.13.0 and earlier
sum(v²) / N / 1000        // v in 0..255; loud signals could exceed 1.0

// 1.14.0 and later
sum((v / 255)²) / N       // range is 0..1
```

Old values are **exactly 65.025× the new ones** (`255² / 1000`).

**Migration.** Multiply by `65.025` to recover pre-1.14 values:

```js
const legacyEnergy = energy(fft) * 65.025
```

If you have shader uniforms, thresholds, or visual tuning calibrated against the old
scale, that one factor restores them. Alternatively stay on the `1.x` line — see below.

### BREAKING — `pitchClass()` lost its `sampleRate` parameter (shipped in 1.13.0)

```js
// 1.12.0 and earlier
pitchClass(fft, sampleRate = 44100)

// 1.13.0 and later
pitchClass(fft)           // 44100 is hardcoded internally
```

The second argument is now **silently ignored**. Callers passing a non-44100 sample rate
were getting correct results before and get wrong ones now, with no error.

**Migration.** Drop the second argument. If you need a sample rate other than 44100,
there is currently no supported way to supply one — stay on `1.12.0`, or open an issue.

### Added

- `CHANGELOG.md` — this file. There was no version history before now.
- Empirically measured output ranges for every feature, documented in `README.md`.
  The absence of documented ranges is the reason the `energy()` rescale went unnoticed.
- `files` field in `package.json`, so the published tarball no longer ships `tests/`,
  `docs/`, `.github/`, and dotfile configs (94 files / 221.7 kB → 25 files / 28.8 kB).
- Publish workflow now derives its npm dist-tag from the major version, checks whether
  the exact version already exists rather than comparing against `latest`, and refuses
  to move `latest` backwards.

### Known issues — not fixed in this release

- **`AudioProcessor.spectralFlux()` throws on roughly half of all calls.**
  `spectralFlux(fft, prev)` indexes `prev` as an array, but `AudioProcessor` passes the
  previous scalar return value. That produces `NaN`, which `makeCalculateStats()` rejects
  by throwing `Input must be a valid number`. The `NaN` becomes the next `previousValue`,
  and because `!NaN` is truthy the following frame falls back to comparing against a
  zero-filled array — so calls alternate between throwing and returning a value that is
  not flux (measured ~1.29 where a correct previous-spectrum comparison gives ~0.43).
  Measured: 135 throws in 300 calls. The functional form `spectralFlux(fft, previousFft)`
  is correct when you pass the previous **spectrum array** yourself.
- `spectralCrest` returns 0–100, not 0–1. `spectralCentroid` can exceed 1 (observed max
  1.32). `bass` never exceeds 0.0625 on a full-scale spectrum. See `README.md`.

## [1.14.0] — 2026-02-19

- **Breaking, unlabeled:** `energy()` rescaled by 65.025× (see 2.0.0). Commit `d1a4039`.
- **Deprecated on npm**, superseded by `2.0.0`: this version shipped a breaking output
  change as a minor bump, so `^1.13.0` consumers received it silently.

## [1.13.0] — 2026-02-19

- **Breaking, unlabeled:** `pitchClass()` lost its `sampleRate` parameter (see 2.0.0).
  Commit `2da3bc3`.
- Last release with the original `energy()` scale, and therefore the base of the `1.x`
  maintenance line.

## [1.12.0] — 2026-02-13

- Added a vitest test suite (#4). Commit `837f5c0`. **No `src/` changes** — verified by
  diff; this release altered no runtime behavior.

## [1.11.0] — 2026-02-13

- Added `rms` and `dbfs` features (#3). Commit `9ec83ac`. Purely additive; both were
  added to the `AudioFeatures` barrel, so `AudioProcessor` gained two methods.
- The `AudioFeatures` array was reordered as a side effect. Its order has never been
  documented as stable; do not depend on it.

## [1.10.2] — 2026-02-13

- CI fixes for npm trusted publishing (#2). Commit `fae4196`.
- **`1.10.0` and `1.10.1` were never published** — the first publish workflow run failed,
  so the released line jumps from `1.9.0` to `1.10.2`.

## [1.9.0] — 2025-03-08

Last release tagged in git (`v1.9.0`). The tagging convention was abandoned after this;
`1.10.2` through `1.14.0` have no git tags.

## [1.8.1] — 2025-02-23

## [1.8.0] and earlier — 2024-04

Initial development, `1.0.0` through `1.8.0`, all published in April 2024. No changelog
was kept; see `git log` for detail.

---

## The 1.x maintenance line

A `1.15.0` is planned on a `1.x` branch for consumers who need the **original**
`energy()` scale — it is `1.13.0` plus the onset detector, with `energy()` reverted.
It publishes under the **`release-1.x`** npm dist-tag, so `npm install hypnosound`
continues to resolve to the `2.x` line:

```sh
npm install hypnosound@release-1.x
```

[2.0.0]: https://github.com/hypnodroid/hypnosound/compare/d1a4039...HEAD
[1.14.0]: https://github.com/hypnodroid/hypnosound/commit/d1a4039
[1.13.0]: https://github.com/hypnodroid/hypnosound/commit/2da3bc3
[1.12.0]: https://github.com/hypnodroid/hypnosound/commit/837f5c0
[1.11.0]: https://github.com/hypnodroid/hypnosound/commit/9ec83ac
[1.10.2]: https://github.com/hypnodroid/hypnosound/commit/fae4196
[1.9.0]: https://github.com/hypnodroid/hypnosound/releases/tag/v1.9.0
