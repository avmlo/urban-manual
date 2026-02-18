"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, StickyNote } from "lucide-react";
import {
  useResourceLibraryStore,
  useSelectedResourceNotes,
} from "../../lib/resource-store";

export function NotesTab() {
  const selectedResourceId = useResourceLibraryStore(
    (s) => s.selectedResourceId
  );
  const addNote = useResourceLibraryStore((s) => s.addNote);
  const updateNote = useResourceLibraryStore((s) => s.updateNote);
  const deleteNote = useResourceLibraryStore((s) => s.deleteNote);
  const notes = useSelectedResourceNotes();

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const startNew = () => {
    setIsEditing("new");
    setEditTitle("");
    setEditBody("");
  };

  const startEdit = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      setIsEditing(noteId);
      setEditTitle(note.title);
      setEditBody(note.body);
    }
  };

  const save = () => {
    if (!selectedResourceId || !editTitle.trim()) return;

    if (isEditing === "new") {
      addNote({
        id: `note-${Date.now()}`,
        resourceId: selectedResourceId,
        title: editTitle.trim(),
        body: editBody.trim(),
        createdAt: new Date().toISOString(),
      });
    } else if (isEditing) {
      updateNote(isEditing, {
        title: editTitle.trim(),
        body: editBody.trim(),
      });
    }

    setIsEditing(null);
    setEditTitle("");
    setEditBody("");
  };

  const cancel = () => {
    setIsEditing(null);
    setEditTitle("");
    setEditBody("");
  };

  if (notes.length === 0 && !isEditing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-[#F0EBE0] flex items-center justify-center mb-4">
          <StickyNote className="w-6 h-6 text-[#6B6B6B]" />
        </div>
        <p className="text-sm font-medium text-[#1A1A1A] mb-1">
          No notes to show yet.
        </p>
        <p className="text-xs text-[#6B6B6B] mb-4">
          Try clicking on &quot;New&quot; to add a new note.
        </p>
        <button
          onClick={startNew}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#1A1A1A]">
          Resource Notes
        </h3>
        <button
          onClick={startNew}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#E8E2D9] bg-white text-xs font-medium text-[#1A1A1A] hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {/* Edit/New Form */}
      {isEditing && (
        <div className="mb-4 p-3 rounded-lg border border-[#E8E2D9] bg-gray-50/50">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Note title"
            className="w-full mb-2 px-3 py-1.5 text-sm border border-[#E8E2D9] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#C75B2A]/40"
          />
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            placeholder="Write your note..."
            rows={4}
            className="w-full px-3 py-1.5 text-sm border border-[#E8E2D9] rounded-lg bg-white resize-none focus:outline-none focus:ring-1 focus:ring-[#C75B2A]/40"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={save}
              disabled={!editTitle.trim()}
              className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={cancel}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#6B6B6B] hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-2">
        {notes.map((note) => (
          <div
            key={note.id}
            className="group p-3 rounded-lg border border-[#E8E2D9] bg-white hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1A1A] mb-0.5">
                  {note.title}
                </p>
                <p className="text-xs text-[#6B6B6B] mb-1.5">
                  {new Date(note.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-[#6B6B6B] line-clamp-2">
                  {note.body}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                <button
                  onClick={() => startEdit(note.id)}
                  className="p-1 rounded-md hover:bg-gray-100 text-[#6B6B6B]"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="p-1 rounded-md hover:bg-red-50 text-[#6B6B6B] hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
