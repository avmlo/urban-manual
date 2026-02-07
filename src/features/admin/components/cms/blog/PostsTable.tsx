"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  type ColumnDef,
  type SortingState,
  type CellContext,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import { Spinner } from "@/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table";
import type { Post, Tag } from "@/types/cms";

interface PostsTableProps {
  workspaceId: string;
  onEditPost: (postId: string) => void;
  onNewPost: () => void;
}

export function PostsTable({
  workspaceId,
  onEditPost,
  onNewPost,
}: PostsTableProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ workspace_id: workspaceId });
      if (globalFilter) params.append("search", globalFilter);

      const response = await fetch(`/api/cms/posts?${params}`);
      const json = await response.json();
      setPosts(json.data || []);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, globalFilter]);

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
    fetchPosts();
    fetchTags();
  }, [fetchPosts, fetchTags]);

  const handleDelete = useCallback(
    async (postId: string) => {
      if (!confirm("Are you sure you want to delete this post?")) return;
      try {
        await fetch(`/api/cms/posts/${postId}`, { method: "DELETE" });
        fetchPosts();
      } catch (error) {
        console.error("Failed to delete post:", error);
      }
    },
    [fetchPosts]
  );

  const columns: ColumnDef<Post>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: (info: CellContext<Post, unknown>) => (
          <button
            onClick={() => onEditPost(info.row.original.id)}
            className="text-left font-medium text-gray-900 dark:text-white hover:underline"
          >
            {info.getValue() as string}
          </button>
        ),
      },
      {
        accessorKey: "blurb",
        header: "Blurb",
        cell: (info: CellContext<Post, unknown>) => {
          const value = info.getValue() as string | null;
          return (
            <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
              {value ? value.substring(0, 100) : "\u2014"}
            </span>
          );
        },
      },
      {
        accessorKey: "published",
        header: "Status",
        cell: (info: CellContext<Post, unknown>) =>
          info.getValue() ? (
            <Badge variant="success">Published</Badge>
          ) : (
            <Badge variant="warning">Draft</Badge>
          ),
      },
      {
        accessorKey: "published_date",
        header: "Date",
        cell: (info: CellContext<Post, unknown>) => {
          const date = info.getValue() as string | null;
          return (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {date ? new Date(date).toLocaleDateString() : "\u2014"}
            </span>
          );
        },
      },
      {
        accessorKey: "tags",
        header: "Tags",
        enableSorting: false,
        cell: (info: CellContext<Post, unknown>) => {
          const tags = (info.getValue() as Tag[]) || [];
          return (
            <div className="flex gap-1 flex-wrap">
              {tags.map((tag: Tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.name}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        cell: (info: CellContext<Post, unknown>) => {
          const date = info.getValue() as string;
          return (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(date).toLocaleDateString()}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: (info: CellContext<Post, unknown>) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(info.row.original.id)}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [onEditPost, handleDelete]
  );

  // Filter posts by selected tags (client-side)
  const filteredPosts = useMemo(() => {
    if (selectedTags.length === 0) return posts;
    return posts.filter((post: Post) =>
      post.tags?.some((tag: Tag) => selectedTags.includes(tag.id))
    );
  }, [posts, selectedTags]);

  const table = useReactTable({
    data: filteredPosts,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Blog Posts
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your blog content
          </p>
        </div>
        <Button onClick={onNewPost}>
          <Plus className="h-4 w-4" />
          New Post
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search posts..."
            value={globalFilter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setGlobalFilter(e.target.value)
            }
            className="pl-10 max-w-sm"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {allTags.map((tag: Tag) => (
              <button
                key={tag.id}
                onClick={() =>
                  setSelectedTags((prev: string[]) =>
                    prev.includes(tag.id)
                      ? prev.filter((t: string) => t !== tag.id)
                      : [...prev, tag.id]
                  )
                }
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTags.includes(tag.id)
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border border-gray-200 dark:border-gray-800">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        onClick={header.column.getToggleSortingHandler()}
                        className={
                          header.column.getCanSort()
                            ? "cursor-pointer select-none flex items-center gap-1"
                            : ""
                        }
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getIsSorted() === "asc"
                          ? " \u2191"
                          : header.column.getIsSorted() === "desc"
                            ? " \u2193"
                            : ""}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Spinner className="size-4" />
                    <span>Loading posts...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-gray-500"
                >
                  No posts yet. Create your first post to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {table.getFilteredRowModel().rows.length} post(s) found
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
