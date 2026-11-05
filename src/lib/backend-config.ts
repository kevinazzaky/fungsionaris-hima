export function isAuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function isBackendConfigured() {
  return Boolean(
    isAuthConfigured() &&
    isDatabaseConfigured() &&
    process.env.SUPABASE_SECRET_KEY,
  );
}

export function isDatabaseConfigured() {
  const value = process.env.DATABASE_URL;
  if (!value || /PROJECT_REF|YOUR_|ENCODED_PASSWORD|aws-REGION/.test(value))
    return false;
  try {
    const url = new URL(value);
    return (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

export const MEDIA_BUCKET = "website-media";
export const REGISTRATION_BUCKET = "registration-files";
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
