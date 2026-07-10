import { db } from "@workspace/db";
import {
  alertsTable,
  eventsTable,
  meetingsTable,
  sourcesTable,
  volunteerOpportunitiesTable,
} from "@workspace/db/schema";

const now = new Date();
const d = (daysFromNow: number, hour = 10, minute = 0) => {
  const dt = new Date(now);
  dt.setDate(dt.getDate() + daysFromNow);
  dt.setHours(hour, minute, 0, 0);
  return dt;
};

async function seed() {
  console.log("Seeding community hub…");

  // Clear existing rows so re-runs are idempotent
  await db.delete(eventsTable);
  await db.delete(alertsTable);
  await db.delete(meetingsTable);
  await db.delete(volunteerOpportunitiesTable);
  await db.delete(sourcesTable);

  // ── Events ──────────────────────────────────────────────────────────────────
  await db.insert(eventsTable).values([
    {
      title: "Dallas Farmers Market",
      description:
        "Fresh produce, local honey, artisan bread, handmade goods, and live acoustic music every Saturday morning at Dallas Town Square.",
      category: "FOOD_DRINK",
      status: "APPROVED",
      startDateTime: d(1, 8, 0),
      endDateTime: d(1, 13, 0),
      locationName: "Dallas Town Square",
      city: "Dallas",
      county: "Paulding",
      isFree: true,
      isKidFriendly: true,
      isOutdoor: true,
      tags: JSON.stringify(["farmers market", "local food", "community"]),
    },
    {
      title: "Trivia Night at The Tap Room",
      description:
        "Weekly Thursday trivia with rotating categories and a $50 bar tab prize for first place. Teams up to 6 people.",
      category: "TRIVIA",
      status: "APPROVED",
      startDateTime: d(3, 19, 0),
      endDateTime: d(3, 21, 30),
      locationName: "The Tap Room Hiram",
      city: "Hiram",
      county: "Paulding",
      isFree: true,
      isKidFriendly: false,
      isOutdoor: false,
      tags: JSON.stringify(["trivia", "bar", "adults"]),
    },
    {
      title: "Rockmart Summer Festival",
      description:
        "Annual downtown Rockmart summer festival featuring live music, food trucks, craft vendors, kids' games, and a classic car show.",
      category: "FESTIVAL",
      status: "APPROVED",
      startDateTime: d(5, 10, 0),
      endDateTime: d(5, 20, 0),
      locationName: "Downtown Rockmart",
      city: "Rockmart",
      county: "Polk",
      isFree: true,
      isKidFriendly: true,
      isOutdoor: true,
      tags: JSON.stringify(["festival", "music", "food trucks", "family"]),
    },
    {
      title: "Paulding County Library Author Talk",
      description:
        "Local author Sarah Hendricks discusses her new novel set in rural Georgia during the post-Civil War era. Books available for signing.",
      category: "LIBRARY",
      status: "APPROVED",
      startDateTime: d(2, 18, 30),
      endDateTime: d(2, 20, 0),
      locationName: "Paulding County Library",
      city: "Dallas",
      county: "Paulding",
      isFree: true,
      isKidFriendly: false,
      isOutdoor: false,
      tags: JSON.stringify(["library", "author talk", "books"]),
    },
    {
      title: "Family Movie Night in the Park",
      description:
        "Bring a blanket and lawn chairs for an outdoor screening of Moana at Paulding Recreation Park. Free popcorn while supplies last.",
      category: "FAMILY",
      status: "APPROVED",
      startDateTime: d(4, 20, 0),
      endDateTime: d(4, 22, 30),
      locationName: "Paulding Recreation Park",
      city: "Dallas",
      county: "Paulding",
      isFree: true,
      isKidFriendly: true,
      isOutdoor: true,
      tags: JSON.stringify(["movie night", "family", "outdoor"]),
    },
    {
      title: "Karaoke at Shorty's Sports Bar",
      description:
        "Friday night karaoke hosted by DJ Mike. Everyone welcome, no sign-up needed. Drink specials from 8–10pm.",
      category: "KARAOKE",
      status: "APPROVED",
      startDateTime: d(6, 20, 0),
      endDateTime: d(6, 23, 59),
      locationName: "Shorty's Sports Bar",
      city: "Cedartown",
      county: "Polk",
      isFree: true,
      isKidFriendly: false,
      isOutdoor: false,
      tags: JSON.stringify(["karaoke", "nightlife", "adults"]),
    },
    {
      title: "Hiram Youth Soccer Sign-Ups",
      description:
        "Register your child ages 5–14 for the fall AYSO soccer season. Registration tables will be set up at the Hiram Recreation Center.",
      category: "SPORTS",
      status: "APPROVED",
      startDateTime: d(7, 9, 0),
      endDateTime: d(7, 14, 0),
      locationName: "Hiram Recreation Center",
      city: "Hiram",
      county: "Paulding",
      isFree: false,
      cost: "$65 per player",
      isKidFriendly: true,
      isOutdoor: false,
      tags: JSON.stringify(["soccer", "youth sports", "registration"]),
    },
    {
      title: "Live Bluegrass Night",
      description:
        "The Cedar Creek Pickers bring classic bluegrass and Appalachian folk music to the stage at Carter's Brew Works. All ages welcome.",
      category: "MUSIC",
      status: "APPROVED",
      startDateTime: d(8, 19, 0),
      endDateTime: d(8, 22, 0),
      locationName: "Carter's Brew Works",
      city: "Dallas",
      county: "Paulding",
      isFree: false,
      cost: "$5 cover",
      isKidFriendly: true,
      isOutdoor: false,
      tags: JSON.stringify(["music", "bluegrass", "live music"]),
    },
    {
      title: "Polk County Nature Walk",
      description:
        "A guided 3-mile nature walk through Silver Creek Nature Preserve. Bring water and sturdy shoes. Family-friendly and free.",
      category: "PARKS_RECREATION",
      status: "APPROVED",
      startDateTime: d(9, 8, 30),
      endDateTime: d(9, 11, 0),
      locationName: "Silver Creek Nature Preserve",
      city: "Rockmart",
      county: "Polk",
      isFree: true,
      isKidFriendly: true,
      isOutdoor: true,
      tags: JSON.stringify(["hiking", "nature", "outdoors", "family"]),
    },
    {
      title: "Back-to-School Resource Fair",
      description:
        "Free school supplies, dental screenings, vision screenings, immunizations, and community resources for K-12 students.",
      category: "SCHOOL",
      status: "APPROVED",
      startDateTime: d(10, 9, 0),
      endDateTime: d(10, 15, 0),
      locationName: "Paulding County Schools Central Office",
      city: "Dallas",
      county: "Paulding",
      isFree: true,
      isKidFriendly: true,
      isOutdoor: false,
      tags: JSON.stringify(["school supplies", "back to school", "kids"]),
    },
  ]);

  // ── Alerts ──────────────────────────────────────────────────────────────────
  await db.insert(alertsTable).values([
    {
      title: "Road Closure: Hardee Rd at Mirror Lake Rd",
      description:
        "Hardee Road is closed between Mirror Lake Road and Villa Rica Road for storm drain repair. Estimated reopening: Friday evening. Use Dallas-Acworth Hwy as alternate route.",
      alertType: "ROAD_CLOSURE",
      severity: "MEDIUM",
      status: "ACTIVE",
      city: "Dallas",
      county: "Paulding",
      startsAt: d(-1, 6, 0),
      expiresAt: d(3, 18, 0),
      sourceName: "Paulding County Roads & Bridges",
    },
    {
      title: "Boil Water Advisory: Polk County Water Authority Zone 4",
      description:
        "The Polk County Water Authority has issued a precautionary boil water advisory for customers in Zone 4 (Rockmart southwest area) following a main break. Boil water for 1 minute before use. Advisory expected to lift within 48 hours pending test results.",
      alertType: "BOIL_WATER_ADVISORY",
      severity: "HIGH",
      status: "ACTIVE",
      city: "Rockmart",
      county: "Polk",
      startsAt: d(-2, 14, 0),
      expiresAt: d(1, 12, 0),
      sourceName: "Polk County Water Authority",
    },
    {
      title: "Scam Alert: Property Tax Refund Phone Calls",
      description:
        "Paulding County residents have reported receiving phone calls claiming they're owed a property tax refund. The Paulding County Tax Commissioner does not make unsolicited refund calls. Do not provide personal information.",
      alertType: "SCAM_WARNING",
      severity: "MEDIUM",
      status: "ACTIVE",
      county: "Paulding",
      startsAt: d(-5, 10, 0),
      sourceName: "Paulding County Tax Commissioner",
    },
    {
      title: "Traffic Signal Outage: Highway 278 & Crossroads Dr",
      description: "Traffic signal at Highway 278 and Crossroads Drive is inoperative due to storm damage. Treat as a four-way stop until repairs are completed.",
      alertType: "TRAFFIC",
      severity: "LOW",
      status: "EXPIRED",
      city: "Hiram",
      county: "Paulding",
      startsAt: d(-7, 8, 0),
      expiresAt: d(-4, 16, 0),
    },
  ]);

  // ── Meetings ─────────────────────────────────────────────────────────────────
  await db.insert(meetingsTable).values([
    {
      title: "Paulding County Board of Commissioners Regular Meeting",
      governmentBody: "Paulding County Board of Commissioners",
      meetingType: "COUNTY_COMMISSION",
      status: "UPCOMING",
      startDateTime: d(6, 18, 0),
      endDateTime: d(6, 21, 0),
      locationName: "Historic Courthouse",
      address: "11 Courthouse Square",
      city: "Dallas",
      county: "Paulding",
      plainEnglishSummary:
        "Regular monthly meeting of the Paulding County Board of Commissioners. Topics expected to include FY2026 budget amendments, two rezoning requests near Seven Hills Drive, and updates on the county road repaving schedule.",
      whyResidentsCare:
        "Rezoning decisions can affect neighborhood character, traffic, and home values. Budget amendments direct where county tax dollars go.",
      keyTopics: JSON.stringify(["FY2026 budget", "rezoning Seven Hills", "road repaving"]),
    },
    {
      title: "Dallas City Council Regular Meeting",
      governmentBody: "City of Dallas City Council",
      meetingType: "CITY_COUNCIL",
      status: "UPCOMING",
      startDateTime: d(8, 19, 0),
      city: "Dallas",
      county: "Paulding",
      locationName: "Dallas City Hall",
      address: "201 Conifer Drive",
      plainEnglishSummary:
        "Dallas City Council meets to discuss downtown revitalization planning, a proposed walking trail connection to the regional greenway, and a grant application for streetscape improvements.",
      whyResidentsCare: "Downtown changes affect property values, walkability, and local business.",
      keyTopics: JSON.stringify(["downtown revitalization", "greenway trail", "streetscape grant"]),
    },
    {
      title: "Paulding County School Board Regular Meeting",
      governmentBody: "Paulding County School District",
      meetingType: "SCHOOL_BOARD",
      status: "UPCOMING",
      startDateTime: d(12, 18, 30),
      locationName: "Paulding County School District Administrative Complex",
      city: "Dallas",
      county: "Paulding",
      plainEnglishSummary:
        "The school board will vote on the 2025-2026 school calendar, hear updates on the new elementary school construction timeline, and discuss proposed changes to the bus transportation policy.",
      whyResidentsCare: "School calendars and bus policy affect working families directly.",
      keyTopics: JSON.stringify(["school calendar 2025-2026", "elementary school construction", "bus policy"]),
    },
    {
      title: "Rockmart City Council Regular Meeting",
      governmentBody: "City of Rockmart City Council",
      meetingType: "CITY_COUNCIL",
      status: "COMPLETED",
      startDateTime: d(-14, 18, 0),
      city: "Rockmart",
      county: "Polk",
      plainEnglishSummary:
        "Council approved a new sidewalk project for Main Street, reviewed Rockmart's water infrastructure capital improvement plan, and heard a presentation from the Rockmart Fire Department.",
      minutesUrl: "https://www.rockmart.org/meetings/2025-june-minutes.pdf",
    },
  ]);

  // ── Volunteer opportunities ───────────────────────────────────────────────
  await db.insert(volunteerOpportunitiesTable).values([
    {
      title: "Food Pantry Distribution Volunteers Needed",
      organization: "Paulding Cooperative Ministries",
      description:
        "Help sort and distribute food to families in need every Wednesday and Saturday morning. No experience needed, just a willing heart.",
      dateTime: null,
      city: "Dallas",
      county: "Paulding",
      status: "OPEN",
      contactEmail: "volunteer@pauldingcm.org",
    },
    {
      title: "Animal Shelter Dog Walkers",
      organization: "Paulding County Animal Shelter",
      description:
        "Our shelter dogs need daily exercise and socialization. Volunteer dog walkers are needed on weekday mornings and weekend afternoons.",
      city: "Dallas",
      county: "Paulding",
      status: "OPEN",
      contactEmail: "shelter@paulding.gov",
    },
    {
      title: "Literacy Tutors – One-on-One Reading Support",
      organization: "Polk County Literacy Coalition",
      description:
        "Work one-on-one with an adult learner to improve reading and writing skills. Training provided. Commitment is 2 hours per week.",
      city: "Cedartown",
      county: "Polk",
      status: "OPEN",
      contactEmail: "info@polkliteracy.org",
    },
    {
      title: "Trail Maintenance Crew – Silver Creek Preserve",
      organization: "Silver Creek Nature Conservancy",
      description:
        "Help clear trail debris, repair drainage structures, and improve signage on 8 miles of nature trails. Next work day: upcoming Saturday.",
      dateTime: d(6, 8, 0),
      city: "Rockmart",
      county: "Polk",
      status: "OPEN",
    },
  ]);

  // ── Sources ──────────────────────────────────────────────────────────────────
  await db.insert(sourcesTable).values([
    {
      name: "Paulding County Official Website",
      url: "https://www.paulding.gov",
      type: "GOVERNMENT",
      section: "EVENTS",
      county: "Paulding",
      active: true,
      scrapeFrequency: "daily",
    },
    {
      name: "City of Dallas Recreation",
      url: "https://www.dallas.ga.gov/parks-recreation",
      type: "RECREATION",
      section: "EVENTS",
      city: "Dallas",
      county: "Paulding",
      active: true,
      scrapeFrequency: "daily",
    },
    {
      name: "Polk County Government",
      url: "https://www.polkgeorgia.com",
      type: "GOVERNMENT",
      section: "ALERTS",
      county: "Polk",
      active: true,
      scrapeFrequency: "daily",
    },
    {
      name: "Paulding County Library Events",
      url: "https://www.library.paulding.ga.us",
      type: "WEBSITE",
      section: "EVENTS",
      county: "Paulding",
      active: true,
      scrapeFrequency: "weekly",
    },
  ]);

  console.log("Seed complete ✓");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
