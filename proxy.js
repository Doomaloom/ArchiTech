import { NextResponse } from "next/server";
import { updateSession } from "./app/_lib/supabase/middleware";

export async function proxy(request) {
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    const origin = request.headers.get("origin");
    const requestHeaders = request.headers.get(
      "access-control-request-headers"
    );
    const requestMethod = request.headers.get(
      "access-control-request-method"
    );

    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
    response.headers.set(
      "Access-Control-Allow-Methods",
      requestMethod ?? "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    if (requestHeaders) {
      response.headers.set("Access-Control-Allow-Headers", requestHeaders);
    }
    response.headers.set(
      "Vary",
      "Origin, Access-Control-Request-Headers, Access-Control-Request-Method"
    );

    return response;
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
