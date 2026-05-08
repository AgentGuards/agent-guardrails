"use client";

import { useCallback, useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_KEY = "guardrails-tour-completed";

type DriverInstance = ReturnType<typeof driver>;

function createTourDriver(): DriverInstance {
  return driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    stagePadding: 8,
    stageRadius: 14,
    popoverClass: "guardrails-tour-popover",
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Got it!",
    progressText: "{{current}} of {{total}}",
    onDestroyed: () => {
      try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* */ }
    },
    steps: [
      {
        element: "#tour-stats",
        popover: {
          title: "Fleet Overview",
          description: "Your key metrics at a glance — active agents, threats blocked, daily spend, and fleet compliance score.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-activity",
        popover: {
          title: "Activity Timeline",
          description: "Real-time feed of guarded transactions. Each shows the Guardian verdict — allow, flag, or pause — with reasoning.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-sidebar",
        popover: {
          title: "Agent Health & Quick Actions",
          description: "Create new agents, view compliance gauge, and monitor each agent's anomaly score and spend in real time.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "#tour-incidents",
        popover: {
          title: "Incidents",
          description: "When Guardian detects a threat, it pauses the agent and logs an incident here with a full postmortem report.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tour-live",
        popover: {
          title: "Live Events",
          description: "Raw SSE event stream from the server — transactions, verdicts, pauses, and escalations appear here in real time.",
          side: "top",
          align: "start",
        },
      },
    ],
  });
}

/** Hook: auto-starts tour on first sign-in, provides manual trigger */
export function useProductTour() {
  const driverRef = useRef<DriverInstance | null>(null);

  const startTour = useCallback(() => {
    if (driverRef.current) {
      try { driverRef.current.destroy(); } catch { /* */ }
    }
    driverRef.current = createTourDriver();
    driverRef.current.drive();
  }, []);

  // Auto-start on first visit
  useEffect(() => {
    try { if (localStorage.getItem(TOUR_KEY)) return; } catch { return; }
    const timer = setTimeout(() => {
      driverRef.current = createTourDriver();
      driverRef.current.drive();
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        try { driverRef.current.destroy(); } catch { /* */ }
      }
    };
  }, []);

  return { startTour };
}
