# Time of Closest Approach (TCA)

The Time of Closest Approach (TCA) is the instant during a conjunction
when the centers of mass of the two objects reach their minimum separation.
It is the single most important number in a conjunction assessment because
all other quantities — miss distance, relative velocity, collision
probability — are defined at that moment.

## How TCA is computed

Computing TCA involves two stages:

1. Coarse scan: both objects' orbits are propagated forward from their TLE
   epochs over the screening horizon (for example 24-48 hours) at fixed
   intervals such as one minute. The distance between the two position
   vectors is evaluated at each step, and the step with the smallest
   separation gives a coarse TCA candidate.
2. Refinement: around the coarse candidate, propagation is repeated at
   much finer steps (seconds), or a root-finding method is applied on the
   derivative of the squared separation distance, to pinpoint the true
   minimum within the coarse interval.

This system follows exactly this pattern: a coarse scan over trajectory
points followed by refined SGP4 re-propagation near the closest approach.

## Uncertainty growth near TCA

The farther ahead of the event a prediction is made, the less certain the
TCA is. Position errors from the TLE fit and atmospheric drag accumulate
over the propagation window, typically growing to 1-3 km per day. Close to
the actual event, updated tracking shrinks the uncertainty ellipse, which
is why operators re-screen frequently and often wait until hours before
TCA before committing to a maneuver decision.
