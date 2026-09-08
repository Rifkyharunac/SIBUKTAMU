"use client";

import { useEffect } from "react";
import { getActiveVisit } from "@/lib/active-visit";

export function ActiveVisitRedirect() {
  useEffect(() => {
    const active = getActiveVisit();
    if (active) window.location.replace(active.resumePath);
  }, []);

  return null;
}
