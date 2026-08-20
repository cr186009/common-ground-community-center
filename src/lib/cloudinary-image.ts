type CloudinaryImageOptions = {
  width: number;
  height: number;
  cloudName?: string | null;
};

function validDimension(value: number) {
  return Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

/**
 * Routes a remote image through Cloudinary fetch delivery when configured.
 * Invalid, local, and already-Cloudinary URLs retain their original value.
 */
export function getDeliveredImageUrl(
  imageUrl: string | null | undefined,
  options: CloudinaryImageOptions,
) {
  if (!imageUrl) return imageUrl;

  const cloudName = (
    options.cloudName ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ""
  ).trim();
  const width = validDimension(options.width);
  const height = validDimension(options.height);

  if (!cloudName || !width || !height || !/^[a-z0-9_-]+$/i.test(cloudName)) {
    return imageUrl;
  }

  let source: URL;
  try {
    source = new URL(imageUrl);
  } catch {
    return imageUrl;
  }

  if (
    (source.protocol !== "http:" && source.protocol !== "https:") ||
    source.hostname.toLowerCase() === "res.cloudinary.com"
  ) {
    return imageUrl;
  }

  const transformations = [
    "f_auto",
    "q_auto",
    "c_fill",
    "g_auto",
    `w_${width}`,
    `h_${height}`,
  ].join(",");

  return `https://res.cloudinary.com/${cloudName}/image/fetch/${transformations}/${encodeURIComponent(source.toString())}`;
}
