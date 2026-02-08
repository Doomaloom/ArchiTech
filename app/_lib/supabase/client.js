"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

let browserClient = null;

export function createBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  browserClient = createBrowserClient(url, publishableKey);
  return browserClient;
}
