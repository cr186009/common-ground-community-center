/** Sources intentionally maintained by the automated collection fleet. */
export const MANAGED_AUTOMATED_SOURCE_NAMES = [
  "City of Dallas official events page",
  "Paulding County Public Calendar",
  "City of Acworth Events",
  "City of Hiram official site",
  "Downtown Dallas / MyDallasGA",
  "City of Kennesaw events",
  "Cobb Schools — Kennesaw campuses",
  "Kennesaw State University public events",
  "City of Marietta calendar",
  "City of Rockmart official site",
  "Visit Woodstock events",
  "Explore Canton events",
  "Cherokee Recreation & Parks events",
  "Cherokee County Chamber events",
  "West Georgia Regional Library events",
  "Polk County Chamber events",
  "Polk County official calendar",
  "Rockmart Cultural Arts Center",
  "National Weather Service alerts",
  "North Cobb Regional Library events",
  "Paulding County School District events",
  "Cherokee County School District — Canton coverage",
] as const;

/** Known integrations that must remain inactive until their access issue is resolved. */
export const HELD_SOURCE_NAMES = ["Downtown Cedartown events page"] as const;
