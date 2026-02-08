function firstDefinedValue(values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

export function getSupabaseUrl() {
  const url = firstDefinedValue([process.env.NEXT_PUBLIC_SUPABASE_URL]);
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

export function getSupabasePublishableKey() {
  const key = firstDefinedValue([
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ]);
  if (!key) {
    throw new Error(
      "Missing Supabase publishable key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy)."
    );
  }
  return key;
}

export function getSupabaseSecretKey() {
  const key = firstDefinedValue([
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_SECRET_DEFAULT_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ]);
  if (!key) {
    throw new Error(
      "Missing Supabase server key. Set SUPABASE_SECRET_KEY (preferred), SUPABASE_SECRET_DEFAULT_KEY, or SUPABASE_SERVICE_ROLE_KEY (legacy)."
    );
  }
  return key;
}
