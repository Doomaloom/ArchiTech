"use client";

import { useCallback, useState } from "react";
import html2canvas from "html2canvas";

const captureElementImage = async (element) => {
  if (!element) {
    throw new Error("Preview surface is unavailable.");
  }
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: window.devicePixelRatio || 1,
    useCORS: true,
  });
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
};

export default function useRegeneration({ iterationPreviewRef }) {
  const [lastRequest, setLastRequest] = useState(null);
  const [regenError, setRegenError] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  const runRegeneration = useCallback(
    async (payload) => {
      setIsRegenerating(true);
      setRegenError("");
      try {
        const surface = iterationPreviewRef?.current;
        const snapshot = await captureElementImage(surface);
        const request = {
          ...payload,
          snapshot,
          requestedAt: new Date().toISOString(),
        };
        setLastRequest(request);
        return request;
      } catch (error) {
        setRegenError(error?.message ?? "Unable to regenerate right now.");
        return null;
      } finally {
        setIsRegenerating(false);
      }
    },
    [iterationPreviewRef]
  );

  return {
    state: { lastRequest, regenError, isRegenerating },
    actions: { runRegeneration },
  };
}
