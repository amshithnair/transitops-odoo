# Business Rules

This document lists the core business rules enforced by the system. Reference these rule numbers in the codebase at every enforcement point.

1. Vehicle registration number must be unique.
2. `Retired` or `In Shop` vehicles must never appear in the dispatch/vehicle-selection pool.
3. Drivers with an expired license or `Suspended` status cannot be assigned to a trip.
4. A driver or vehicle already `On Trip` cannot be assigned to another trip.
5. Cargo weight must not exceed the vehicle's maximum load capacity.
6. Dispatching a trip automatically sets both vehicle and driver status to `On Trip`.
7. Completing a trip automatically sets both vehicle and driver status back to `Available`.
8. Cancelling a dispatched trip restores vehicle and driver to `Available`.
9. Creating an active maintenance record automatically sets vehicle status to `In Shop`.
10. Closing maintenance restores vehicle to `Available` unless the vehicle is `Retired`.
