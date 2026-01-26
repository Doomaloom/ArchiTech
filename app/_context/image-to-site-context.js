import { createContext, useContext } from "react";

const ImageToSiteContext = createContext(null);

export function ImageToSiteProvider({ value, children }) {
  return (
    <ImageToSiteContext.Provider value={value}>
      {children}
    </ImageToSiteContext.Provider>
  );
}

export function useImageToSite() {
  const context = useContext(ImageToSiteContext);
  if (!context) {
    throw new Error("useImageToSite must be used within ImageToSiteProvider");
  }
  return context;
}
