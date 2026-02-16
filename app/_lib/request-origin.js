export function getRequestOrigin(request) {
  if (!request) {
    return "";
  }

  const headers = request.headers;
  const forwardedHost = headers?.get?.("x-forwarded-host");
  const forwardedProto = headers?.get?.("x-forwarded-proto");

  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    const proto =
      forwardedProto?.split(",")[0].trim() ||
      request.nextUrl?.protocol?.replace(":", "") ||
      "https";
    return `${proto}://${host}`;
  }

  if (request.nextUrl?.origin) {
    return request.nextUrl.origin;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}
