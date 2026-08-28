# TLE (Two-Line Element Set)

A Two-Line Element Set (TLE) is the standard data format for encoding the
orbital state of an Earth-orbiting object. Each TLE is exactly two lines of
80 characters, produced by fitting SGP4 to radar and optical tracking
observations.

## Format fields

Line 0 (optional) carries the object name. Line 1 contains: satellite
catalog number, classification, international designator, epoch (two-digit
year plus day of year with fractional day), first and second derivatives of
mean motion, B* drag term, and ephemeris type. Line 2 contains: inclination,
right ascension of the ascending node, orbital eccentricity, argument of
perigee, mean anomaly, mean motion (revolutions per day), and revolution
number at epoch. Both lines end with checksum digits.

## Where TLEs are fetched

The two primary public sources are CelesTrak (which mirrors Space-Track
data without requiring an account) and Space-Track.org (the official US
Space Force catalog distribution site). This system queries CelesTrak's GP
data API per NORAD catalog ID and caches results locally, with bundled
static fallback TLEs so analysis continues when the network is unavailable.

## Epoch, decay and staleness

The epoch is the instant at which the fitted orbital elements were valid.
Because atmospheric drag continuously lowers low-Earth orbits and SGP4
errors grow roughly 1-3 km per day from epoch, a TLE becomes stale quickly:
for conjunction work, element sets more than a day or two old can produce
misleading miss distances. Objects near reentry decay rapidly and their
published elements change hourly. Operational practice is to always use
the freshest available TLE and note its epoch alongside any prediction.
