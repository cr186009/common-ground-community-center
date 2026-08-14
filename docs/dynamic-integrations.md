# Dynamic integrations

The site supports three optional enhancements. Each has a safe fallback, so
missing credentials do not break event discovery.

## Motion

Motion is installed as a normal frontend dependency. Event cards now reveal
with a short opacity/position transition as they enter the viewport and move
smoothly when a filtered grid changes. Visitors who prefer reduced motion get
the original non-animated behavior automatically.

No account or environment variable is required.

## Cloudinary image delivery

Cloudinary is used as an image delivery layer, not as the source of event data.
The database continues to store the original Pexels, organizer, or community
image URL. When Cloudinary is configured, the browser receives a Cloudinary
fetch URL that:

- crops card images consistently around an automatically selected focal point;
- resizes card images to 960×540 and hero images to 1600×800;
- chooses an efficient output format automatically;
- applies automatic quality selection; and
- lets Cloudinary cache the transformed result for later requests.

Without Cloudinary, the original URL is used unchanged.

Setup:

1. Create a Cloudinary account and locate the cloud name on the dashboard.
2. Add `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` to Replit/deployment secrets.
3. Enable or permit authenticated/allowlisted remote fetch delivery in the
   Cloudinary security settings if the account blocks fetched remote images.
4. Rebuild and redeploy the application.

The cloud name is a public identifier, not an API secret. This prototype does
not upload files and therefore does not need a Cloudinary API key or secret.
Resident uploads should be a separate signed-upload project with moderation,
file-size, MIME-type, and abuse controls.

## Leaflet and OpenStreetMap event map

The Events list includes an interactive Leaflet map using OpenStreetMap tiles.
It requires no account, token, or payment information. The current database
does not store latitude/longitude, so this version uses known city-center
coordinates and labels every pin as approximate. A complete event-location
list remains usable if JavaScript or map tiles are unavailable.

Operational requirements:

1. Retain the visible linked OpenStreetMap attribution.
2. Do not proxy, bulk-download, prefetch, or disable caching for public tiles.
3. Keep the site referrer available to the tile service.
4. Move to an OSM-compatible provider with an SLA if traffic becomes material.

A later iteration can geocode venue addresses on the server, cache the
coordinates, and replace approximate city-center pins with exact venue pins.

## Environment variables

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
```

The Cloudinary value is optional. Motion and Leaflet work without accounts or
tokens; Cloudinary falls back to original images when it is not configured.
