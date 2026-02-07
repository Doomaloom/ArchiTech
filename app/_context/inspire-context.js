import { createContext, useContext } from "react";

const InspireContext = createContext(null);

export function InspireProvider({ value, children }) {
  return (
    <InspireContext.Provider value={value}>{children}</InspireContext.Provider>
  );
}

export function useInspire() {
  const context = useContext(InspireContext);
  if (!context) {
    throw new Error("useInspire must be used within InspireProvider");
  }
  return context;
}
