# SGP4 Propagation Model

SGP4 (Simplified General Perturbations model, version 4) is the standard
analytical orbit propagation model used operationally for Earth-orbiting
objects. It was developed by NORAD in the 1970s and remains the model paired
with Two-Line Element (TLE) sets published by CelesTrak and Space-Track.

## How it works

SGP4 is a "simplified general perturbation" model: instead of numerically
integrating every force acting on a satellite, it uses an analytical
solution that includes the dominant perturbations — Earth's oblateness
(J2 effect), atmospheric drag, and secular and long-period periodic terms.
This makes it fast enough to propagate tens of thousands of catalog objects
in real time.

## Reference frames and inputs

SGP4 takes a TLE as input and outputs position and velocity in the TEME
(True Equator, Mean Equinox) frame, expressed in kilometers and kilometers
per second. TEME is an Earth-centered inertial frame; converting to other
frames (such as ECI/J2000 or ECEF) requires rotation matrices based on the
propagation time.

## Accuracy limits

SGP4's accuracy is limited by the quality of the TLE it consumes. Typical
position error grows over time: a fresh TLE yields roughly kilometer-level
accuracy at epoch, but errors grow to approximately 1-3 km per day away
from the TLE epoch as drag and unmodeled forces accumulate. For this
reason, conjunction analysis should always use recent TLEs and avoid
long extrapolations beyond the element set epoch.

## Why it is used operationally

Despite its simplifications, SGP4 is used worldwide because it is the exact
model fitted to the published TLE data — propagating with anything else
introduces systematic mismatch. It is deterministic, extremely fast,
publicly documented, and consistent with the catalog maintenance process,
making it the practical standard for screening, tracking, and conjunction
assessment.
