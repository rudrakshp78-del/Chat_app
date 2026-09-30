import { AWS_S3_REGION, S3_BUCKET_NAME } from "../config";

/**
 * Standard crisp null user avatar silhouette (SVG data URI).
 * Matches WhatsApp's default avatar when no profile picture has been set.
 * Self-contained, zero network latency, zero DNS dependencies.
 */
export const DEFAULT_USER_AVATAR =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+CiAgPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNDRkQ4REMiLz4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjM4IiByPSIxOCIgZmlsbD0iI0ZGRkZGRiIvPgogIDxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik01MCA2MiBjLTIyIDAgLTM2IDEyIC0zOCAzMiBoNzYgYy0yIC0yMCAtMTYgLTMyIC0zOCAtMzIgeiIvPgo8L3N2Zz4=";

export const getMockAvatar = () => DEFAULT_USER_AVATAR;

/**
 * Returns a valid, loadable avatar image URL.
 * If user added their own picture (data URI, web URL, blob, or S3 upload), returns it.
 * If user has not added a picture (null, undefined, empty, or old dummy cartoon caricature),
 * returns DEFAULT_USER_AVATAR (null user image).
 */
export const getAvatarUrl = (avatar) => {
  if (!avatar || typeof avatar !== "string" || avatar.trim() === "") {
    return DEFAULT_USER_AVATAR;
  }

  const trimmed = avatar.trim();

  // If literally "null" or "undefined" as string
  if (trimmed === "null" || trimmed === "undefined") {
    return DEFAULT_USER_AVATAR;
  }

  // If pointing to cloudflare-ipfs or dead IPFS, or legacy dicebear cartoon caricatures
  if (
    trimmed.includes("cloudflare-ipfs.com") ||
    trimmed.includes("ipfs/") ||
    trimmed.includes("dicebear.com")
  ) {
    return DEFAULT_USER_AVATAR;
  }

  // If already a complete URL, data URI, or blob URL
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

  // If not a valid image path, return default null user avatar
  return DEFAULT_USER_AVATAR;
};

export default getAvatarUrl;
