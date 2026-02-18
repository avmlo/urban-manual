"use client";

import { useResourceLibraryStore } from "../lib/resource-store";
import { ResourceListPanel, ShowListButton } from "./ResourceListPanel";
import { ResourceDetailPanel } from "./ResourceDetailPanel";
import { AddResourcePanel } from "./AddResourcePanel";
import { AddGuidePanel } from "./AddGuidePanel";
import { AddPartnerPanel } from "./AddPartnerPanel";
import { AddListPanel } from "./AddListPanel";
import { MapView } from "./MapView";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/ui/resizable";

function RightPanel() {
  const panelView = useResourceLibraryStore((s) => s.panelView);

  switch (panelView) {
    case "detail":
      return <ResourceDetailPanel />;
    case "add-resource":
      return <AddResourcePanel />;
    case "add-guide":
      return <AddGuidePanel />;
    case "add-partner":
      return <AddPartnerPanel />;
    case "add-list":
      return <AddListPanel />;
    case "list":
    default:
      return <ResourceListPanel />;
  }
}

export function LibraryPage() {
  const layoutMode = useResourceLibraryStore((s) => s.layoutMode);

  return (
    <div
      className="w-full rounded-xl border border-[#E8E2D9] overflow-hidden bg-[#F5F0E8]"
      style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}
    >
      {layoutMode === "split" && (
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
            <MapView />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="h-full bg-[#F5F0E8] overflow-hidden">
              <RightPanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {layoutMode === "map-full" && (
        <div className="relative h-full">
          <MapView />
          <ShowListButton />
        </div>
      )}

      {layoutMode === "list-full" && (
        <div className="h-full bg-[#F5F0E8] overflow-hidden">
          <RightPanel />
        </div>
      )}
    </div>
  );
}
