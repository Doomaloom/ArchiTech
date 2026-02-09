const toBoolean = (value) => {
  if (value == null) {
    return false;
  }
  const normalized = value.toString().trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
};

export const BYPASS_AUTH = toBoolean(process.env.NEXT_PUBLIC_BYPASS_AUTH);
export const DISABLE_PERSISTENCE =
  BYPASS_AUTH || toBoolean(process.env.NEXT_PUBLIC_DISABLE_PERSISTENCE);

