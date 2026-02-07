"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Badge } from "@/ui/badge";
import { Spinner } from "@/ui/spinner";
import type { Post, Tag } from "@/types/cms";

interface PostEditorProps {
  postId?: string;
  workspaceId: string;
  onBack: () => void;
  onSave?: (post: Post) => void;
}

export function PostEditor({
  postId,
  workspaceId,
  onBack,
  onSave,
}: PostEditorProps) {
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [publishedDate, setPublishedDate] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!postId);
  const [newTagName, setNewTagName] = useState("");

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/cms/posts/${postId}`);
      const json = await response.json();
      const post = json.data as Post | undefined;
      if (post) {
        setTitle(post.title || "");
        setBlurb(post.blurb || "");
        setContent(post.content || "");
        setPublished(post.published || false);
        setPublishedDate(
          post.published_date
            ? new Date(post.published_date).toISOString().slice(0, 16)
            : ""
        );
        setSelectedTagIds(post.tags?.map((t: Tag) => t.id) || []);
      }
    } catch (error) {
      console.error("Failed to fetch post:", error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/cms/tags?workspace_id=${workspaceId}`
      );
      const json = await response.json();
      setAllTags(json.data || []);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchPost();
    fetchTags();
  }, [fetchPost, fetchTags]);

  const handleSave = async () => {
    if (!title.trim()) return;

    try {
      setSaving(true);
      const method = postId ? "PUT" : "POST";
      const url = postId ? `/api/cms/posts/${postId}` : "/api/cms/posts";

      const body: Record<string, unknown> = {
        title: title.trim(),
        blurb: blurb.trim() || null,
        content: content.trim() || null,
        published,
        published_date: publishedDate
          ? new Date(publishedDate).toISOString()
          : null,
        tag_ids: selectedTagIds,
      };

      if (!postId) {
        body.workspace_id = workspaceId;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await response.json();
      if (json.data) {
        onSave?.(json.data);
        onBack();
      }
    } catch (error) {
      console.error("Failed to save post:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const response = await fetch("/api/cms/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTagName.trim(),
          workspace_id: workspaceId,
        }),
      });
      const json = await response.json();
      if (json.data) {
        setAllTags((prev: Tag[]) => [...prev, json.data]);
        setSelectedTagIds((prev: string[]) => [...prev, json.data.id]);
        setNewTagName("");
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {postId ? "Edit Post" : "New Post"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPublished(!published)}
          >
            {published ? (
              <>
                <EyeOff className="h-4 w-4" /> Unpublish
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" /> Publish
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Editor Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <Input
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
              placeholder="Post title..."
              className="text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Blurb
            </label>
            <Textarea
              value={blurb}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setBlurb(e.target.value)
              }
              placeholder="A short preview of your post..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content
            </label>
            <Textarea
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setContent(e.target.value)
              }
              placeholder="Write your post content here..."
              rows={20}
              className="font-mono text-sm"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Status
            </h3>
            <div className="flex items-center gap-2">
              {published ? (
                <Badge variant="success">Published</Badge>
              ) : (
                <Badge variant="warning">Draft</Badge>
              )}
            </div>
            {published && (
              <div className="mt-3">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Publish Date
                </label>
                <Input
                  type="datetime-local"
                  value={publishedDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPublishedDate(e.target.value)
                  }
                  className="text-sm"
                />
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {allTags.map((tag: Tag) => (
                <button
                  key={tag.id}
                  onClick={() =>
                    setSelectedTagIds((prev: string[]) =>
                      prev.includes(tag.id)
                        ? prev.filter((id: string) => id !== tag.id)
                        : [...prev, tag.id]
                    )
                  }
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewTagName(e.target.value)
                }
                placeholder="New tag..."
                className="text-sm"
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
