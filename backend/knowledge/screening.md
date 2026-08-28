# Conjunction Screening Method

Screening is the systematic process of checking whether any two catalog
objects will pass close together within a prediction window. Because the
catalog contains tens of thousands of objects, screening is built to be
fast first and precise only where needed.

## Pairwise approach

Every candidate pair of objects is compared independently: trajectories are
propagated over the horizon and the separation between the two position
vectors is evaluated step by step. Pairs whose minimum separation stays far
outside the screening volume are discarded immediately.

## Unique pairs only

Each unordered pair is analyzed exactly once. For N objects this means
N*(N-1)/2 combinations — for 10 objects, 45 pairs. Duplicates (A,B) and
(B,A) are eliminated by requiring the smaller index first (i < j), which
halves the workload and keeps results unambiguous.

## Sorting events

All surviving close approaches are sorted by ascending minimum distance so
the most concerning events appear first, letting an operator focus attention
where risk concentrates rather than scanning raw chronological output.

## Coarse versus refined analysis

Coarse analysis uses fixed time steps (for example one minute). At relative
velocities of ~10 km/s, objects move ~600 m per minute-step, so the true
minimum can be missed or overstated by up to hundreds of meters. Refined
analysis re-propagates both orbits at second-level steps around each coarse
closest approach, recovering the true TCA and miss distance. This system
applies exactly this two-stage pattern; residual error remains because
public TLEs carry 1-3 km/day uncertainty regardless of step size.
