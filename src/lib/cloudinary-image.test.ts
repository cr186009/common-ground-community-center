import assert from "node:assert/strict";
import test from "node:test";

import { getDeliveredImageUrl } from "./cloudinary-image";

test("builds an explicit Cloudinary fetch-delivery URL", () => {
  const source = "https://images.pexels.com/photos/123/photo.jpeg?auto=compress&fit=crop";
  assert.equal(
    getDeliveredImageUrl(source, {
      cloudName: "common-ground",
      width: 800,
      height: 450,
    }),
    `https://res.cloudinary.com/common-ground/image/fetch/f_auto,q_auto,c_fill,g_auto,w_800,h_450/${encodeURIComponent(source)}`,
  );
});

test("returns the original URL when delivery is not configured", () => {
  const source = "https://example.com/event.jpg";
  assert.equal(
    getDeliveredImageUrl(source, { cloudName: "", width: 800, height: 450 }),
    source,
  );
});

test("does not proxy local, invalid, or already-Cloudinary images", () => {
  const options = { cloudName: "common-ground", width: 800, height: 450 };
  for (const source of [
    "/event.jpg",
    "not a URL",
    "data:image/png;base64,abc",
    "https://res.cloudinary.com/common-ground/image/upload/event.jpg",
  ]) {
    assert.equal(getDeliveredImageUrl(source, options), source);
  }
});

test("invalid dimensions and cloud names fail gracefully", () => {
  const source = "https://example.com/event.jpg";
  assert.equal(
    getDeliveredImageUrl(source, { cloudName: "bad/name", width: 800, height: 450 }),
    source,
  );
  assert.equal(
    getDeliveredImageUrl(source, { cloudName: "valid", width: 0, height: 450 }),
    source,
  );
});
