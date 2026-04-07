'use client';

import { useBlobUrl } from '@/lib/useBlobUrl';

interface AuthImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** The upload path, e.g. "profile-pictures/profile_123.jpg" or "/uploads/profile-pictures/..." */
  path: string | null | undefined;
  /** Fallback element when image is loading or unavailable */
  fallback?: React.ReactNode;
}

/**
 * Renders an image fetched via authenticated blob URL.
 * Use this instead of plain <img src={BACKEND_URL/uploads/...}> to work
 * with the authenticated /uploads route.
 */
export default function AuthImage({ path: imgPath, fallback, ...imgProps }: AuthImageProps) {
  // Normalize: ensure the path starts with /uploads/
  const normalizedPath = imgPath
    ? imgPath.startsWith('/uploads/')
      ? imgPath
      : imgPath.startsWith('uploads/')
        ? `/${imgPath}`
        : `/uploads/${imgPath}`
    : null;

  const { blobUrl, loading, error } = useBlobUrl(normalizedPath);

  if (!imgPath || loading || error || !blobUrl) {
    return <>{fallback ?? null}</>;
  }

  return <img src={blobUrl} {...imgProps} />;
}
