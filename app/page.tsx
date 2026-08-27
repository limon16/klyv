"use client";

import { PlannerCard } from "../components/planner-card";
import { ResultCard } from "../components/result-card";
import { SiteHeader } from "../components/site-header";
import { SiteFooter, SiteIntro } from "../components/site-intro";
import { useFishingPlanner } from "../hooks/use-fishing-planner";

export default function Home() {
  const planner = useFishingPlanner();

  return (
    <main>
      <SiteHeader
        activeLocation={planner.activeLocation}
        activeLocationLabel={planner.activeLocationLabel}
        editorOpen={planner.locationEditorOpen}
        locationButton={planner.locationButton}
        onRefresh={planner.refreshPage}
        onToggleLocation={
          planner.locationEditorOpen
            ? planner.cancelLocationEdit
            : planner.editLocation
        }
      />
      <SiteIntro />
      <PlannerCard planner={planner} />
      <ResultCard planner={planner} />
      <SiteFooter />
    </main>
  );
}
