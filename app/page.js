"use client";

import ImageToSiteView from "./_components/ImageToSiteView";
import { ImageToSiteProvider } from "./_context/image-to-site-context";
import useImageToSiteState from "./_hooks/use-image-to-site-state";

export default function ImageToSitePage() {
  const model = useImageToSiteState();

  return (
    <ImageToSiteProvider value={model}>
      <ImageToSiteView />
    </ImageToSiteProvider>
  );
}