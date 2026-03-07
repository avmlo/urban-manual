"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PostsTable } from "./PostsTable";
import { PostEditor } from "./PostEditor";
import { Spinner } from "@/ui/spinner";
import { Button } from "@/ui/button";
import type { Workspace } from "@/types/cms";

type View = "table" | "editor";

export function BlogCMS() {
  const [view, setView] = useState<View>("table");
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/cms/workspaces");
      const json = await response.json();
      const ws: Workspace[] = json.data || [];
      setWorkspaces(ws);
      if (ws.length > 0 && !activeWorkspaceId) {
        setActiveWorkspaceId(ws[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreateWorkspace = async () => {
    try {
      setCreatingWorkspace(true);
      const response = await fetch("/api/cms/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Blog" }),
      });
      const json = await response.json();
      if (json.data) {
        setActiveWorkspaceId(json.data.id);
        fetchWorkspaces();
      }
    } catch (error) {
      console.error("Failed to create workspace:", error);
    } finally {
      setCreatingWorkspace(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  // No workspace yet — prompt to create one
  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          No workspace found
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Create a workspace to start managing blog posts.
        </p>
        <Button onClick={handleCreateWorkspace} disabled={creatingWorkspace}>
          {creatingWorkspace ? "Creating..." : "Create Workspace"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Workspace selector (if multiple) */}
      {workspaces.length > 1 && (
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Workspace:
          </span>
          <select
            value={activeWorkspaceId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setActiveWorkspaceId(e.target.value)
            }
            className="text-sm border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            {workspaces.map((ws: Workspace) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main view */}
      {view === "table" && (
        <PostsTable
          workspaceId={activeWorkspaceId}
          onEditPost={(id: string) => {
            setSelectedPostId(id);
            setView("editor");
          }}
          onNewPost={() => {
            setSelectedPostId(undefined);
            setView("editor");
          }}
        />
      )}

      {view === "editor" && (
        <PostEditor
          postId={selectedPostId}
          workspaceId={activeWorkspaceId}
          onBack={() => {
            setView("table");
            setSelectedPostId(undefined);
          }}
        />
      )}
    </div>
  );
}
