# Miss Distance

Miss distance (also called minimum separation) is the smallest distance
between the centers of mass of two space objects during a close approach,
occurring at the time of closest approach (TCA). It is the primary number
used to judge how concerning a conjunction is.

## Components

The miss distance is conventionally decomposed into three components in the
orbital plane frame at TCA:

- Radial: separation along the line away from Earth's center.
- Intrack: separation along the direction of orbital motion.
- Crosstrack: separation perpendicular to the orbital plane.

Intrack errors dominate uncertainty growth because they accumulate from
drag-induced timing differences; crosstalk (crosstrack) geometry changes
slowly and is often the most stable component.

## Screening volumes

Operational screening uses large volumes to catch potential events early:
typical coarse screening volumes are tens of kilometers (for example,
25 km spherical or combined radial/intrack/crosstalk boxes). Anything
inside these volumes triggers closer analysis and possibly a Conjunction
Data Message. This system classifies risk by distance: under 1 km CRITICAL,
under 5 km HIGH, under 25 km MEDIUM, otherwise LOW.

## Interpretation

Very small values (hundreds of meters or less) approach the physical size
of large objects plus navigation uncertainty and warrant serious attention.
Large values (hundreds or thousands of kilometers) indicate the objects'
orbits simply pass far apart and no action is needed. Moderate values must
be interpreted together with trajectory uncertainty: a 5 km miss with 1 km
uncertainty is safer than a 10 km miss predicted days in advance with 15 km
of accumulated error.
