# Conjunction Assessment

Conjunction assessment is the process of determining whether two space
objects are predicted to pass dangerously close to each other, and how
serious the encounter is. It is performed continuously by operators such as
the US 18th/19th Space Defense Squadron, ESA, and private providers for
every operational satellite.

## The screening process

Screening compares predicted trajectories of all catalog object pairs over
a lookahead window. A coarse pass eliminates pairs whose orbits never come
within a large volume (typically tens of kilometers), then surviving pairs
are re-propagated with finer time steps and better data to refine the time
of closest approach (TCA) and miss distance.

## Conjunction Data Messages (CDMs)

When a close approach survives screening, authorities issue a Conjunction
Data Message: a standardized message containing the two objects, TCA,
miss distance and its radial/intrack/crosstalk components, relative
velocity, and collision probability (Pc) along with covariance-based
uncertainty estimates. Operators exchange CDMs to coordinate maneuvers.

## Probability of collision (Pc)

Pc expresses the likelihood of actual impact given both trajectories and
their combined uncertainty volumes at TCA. It depends on miss distance,
relative velocity, and covariance size. Operators commonly take action when
Pc exceeds roughly 1e-4 (some use 1e-5 for crewed vehicles).

## Operational thresholds

Because Pc requires covariance data not available from public TLEs, this
system classifies risk using minimum distance thresholds instead: under
1 km is CRITICAL, under 5 km HIGH, under 25 km MEDIUM, and anything larger
is LOW risk. These distances approximate the screening volumes used in
operational practice.
