import { createJSONStorage } from "zustand/middleware";

// The pure simulation and store lifecycle also run in Node tests without a browser.
export const researchStorage = createJSONStorage(() =>
  typeof window !== "undefined"
    ? window.localStorage
    : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
);
