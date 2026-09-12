"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

const ViewOnlyContext = createContext(true);

export function AccessProvider({ viewOnly, children }: { viewOnly: boolean; children: ReactNode }) {
  return <ViewOnlyContext.Provider value={viewOnly}>{children}</ViewOnlyContext.Provider>;
}

export function useViewOnly() {
  return useContext(ViewOnlyContext);
}
