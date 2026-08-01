# Geographic coverage policy

The event hub's default geographic scope is a 25-mile radius around Dallas City Hall, a stable central-Paulding reference point. Paulding County records are always classified as core coverage, even when a venue has not been geocoded. Records outside Paulding use venue coordinates—not city or county name alone—to determine whether they are within the radius.

The pure policy module in `src/lib/geographic-coverage.ts` supports five outcomes:

- `CORE_PAULDING`: identified as Paulding County
- `WITHIN_RADIUS`: venue is at most 25 miles from the configured center
- `BORDERLINE`: venue is in the default five-mile review buffer beyond the radius
- `OUT_OF_AREA`: venue is beyond the radius and review buffer
- `UNKNOWN`: coordinates are missing or invalid and the record is not known to be in Paulding

The center, radius, review buffer, and core county are configurable. `UNKNOWN` and `BORDERLINE` records should be reviewed rather than automatically rejected. A city label is not sufficient evidence to reject an event because municipal and postal boundaries do not match a circular coverage area.

## Candidate calendar audit area

Source discovery should begin with Paulding County and nearby portions of Cobb, Polk, Bartow, Cherokee, Douglas, and Haralson counties. Likely calendar candidates include Dallas, Hiram, Powder Springs, Acworth, Villa Rica, Douglasville, Rockmart, and Kennesaw. Borderline communities such as Cedartown and Woodstock may still have individual venues inside the configured boundary.

This is a discovery list, not an automatic inclusion list. Each event venue should be geocoded and classified independently before geographic policy is enforced.
