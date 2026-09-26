import { AWS_S3_REGION, S3_BUCKET_NAME } from "../config";

export const getMockAvatar = (seed) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || "user")}`;

/**
 * Returns a valid, loadable avatar image URL.
 * Falls back to DiceBear SVG avatars if an image is missing, relative/unhosted,
 * pointing to cloudflare-ipfs (which fails DNS resolution in many regions), or
 * pointing to an unconfigured AWS S3 bucket, preventing ERR_NAME_NOT_RESOLVED errors.
 */
export const getAvatarUrl = (avatar, name) => {
  const fallbackSeed = encodeURIComponent(name || "User");
  const dicebearUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${fallbackSeed}`;

  if (!avatar || typeof avatar !== "string" || avatar.trim() === "") {
    return dicebearUrl;
  }

  const trimmed = avatar.trim();

  // If pointing to cloudflare-ipfs.com (which has dead DNS / blocked in many regions), use DiceBear
  if (trimmed.includes("cloudflare-ipfs.com") || trimmed.includes("ipfs/")) {
    return dicebearUrl;
  }

  // If already a complete URL or data URI, return as-is
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  // If root-relative web path
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  // If S3 bucket is properly configured (non-empty and not dummy placeholder)
  if (
    S3_BUCKET_NAME &&
    S3_BUCKET_NAME !== "rudrakshp78" &&
    S3_BUCKET_NAME.trim() !== ""
  ) {
    return `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${trimmed}`;
  }

  // Fallback to DiceBear with avatar name as seed
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
    trimmed.replace(/\.[^/.]+$/, "") || name || "User"
  )}`;
};

export default getAvatarUrl;
