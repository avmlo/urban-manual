"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useResourceLibraryStore } from "../lib/resource-store";
import type { Resource } from "../lib/types";

interface ListItem {
  title: string;
  description: string;
}

export function AddListPanel() {
  const setPanelView = useResourceLibraryStore((s) => s.setPanelView);
  const addResource = useResourceLibraryStore((s) => s.addResource);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ListItem[]>([
    { title: "", description: "" },
  ]);

  const addItem = () => {
    setItems([...items, { title: "", description: "" }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof ListItem, value: string) => {
    setItems(
      items.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const list: Resource = {
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      type: "list",
      description: [
        description.trim(),
        ...items
          .filter((i) => i.title.trim())
          .map((i) => `- ${i.title}: ${i.description}`),
      ]
        .filter(Boolean)
        .join("\n"),
      address: "",
      phone: "",
      website: "",
      googleMapsUrl: "",
      agentBookingLink: "",
      price: "",
      hours: "",
      partnerType: "",
      urlLink: "",
      tags: [],
      images: [],
      affiliates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lat: null,
      lng: null,
      hasUnreadUpdate: false,
    };

    addResource(list);
    setPanelView("list");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E2D9]">
        <h2 className="text-base font-semibold text-[#1A1A1A]">Add List</h2>
        <button
          onClick={() => setPanelView("list")}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-[#6B6B6B]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#6B6B6B] mb-1">
            List Name<span className="text-[#C75B2A] ml-0.5">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 px-3 text-sm border border-[#E8E2D9] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#C75B2A]/30"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B6B6B] mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-[#E8E2D9] rounded-lg bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#C75B2A]/30"
          />
        </div>

        {/* List Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-[#6B6B6B]">Items</label>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-xs text-[#C75B2A] hover:underline"
            >
              <Plus className="w-3 h-3" />
              Add item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex gap-2 items-start p-3 border border-[#E8E2D9] rounded-lg bg-gray-50/50"
              >
                <div className="flex-1 space-y-2">
                  <input
                    value={item.title}
                    onChange={(e) => updateItem(idx, "title", e.target.value)}
                    placeholder="Item title"
                    className="w-full h-8 px-2.5 text-sm border border-[#E8E2D9] rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#C75B2A]/40"
                  />
                  <input
                    value={item.description}
                    onChange={(e) =>
                      updateItem(idx, "description", e.target.value)
                    }
                    placeholder="Item description"
                    className="w-full h-8 px-2.5 text-xs border border-[#E8E2D9] rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#C75B2A]/40"
                  />
                </div>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 rounded-md hover:bg-red-50 text-[#6B6B6B] hover:text-red-500 mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-[#E8E2D9]">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full h-10 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Add List
        </button>
      </div>
    </div>
  );
}
