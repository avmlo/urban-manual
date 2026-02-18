"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { Resource } from "../../lib/types";
import { useResourceLibraryStore } from "../../lib/resource-store";
import { cn } from "@/lib/utils";

interface DetailsTabProps {
  resource: Resource;
}

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  const isUrl = value.startsWith("http");
  return (
    <div className="flex items-start py-2.5 border-b border-gray-50 last:border-b-0">
      <span className="w-36 flex-shrink-0 text-[13px] text-[#6B6B6B]">{label}</span>
      {isUrl ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#C75B2A] hover:underline break-all"
        >
          {value}
        </a>
      ) : (
        <span className="text-sm text-[#1A1A1A]">{value}</span>
      )}
    </div>
  );
}

export function DetailsTab({ resource }: DetailsTabProps) {
  const updateResource = useResourceLibraryStore((s) => s.updateResource);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !resource.tags.includes(tag)) {
      updateResource(resource.id, { tags: [...resource.tags, tag] });
    }
    setNewTag("");
    setShowTagInput(false);
  };

  const removeTag = (tag: string) => {
    updateResource(resource.id, {
      tags: resource.tags.filter((t) => t !== tag),
    });
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="space-y-6">
      {/* Tags */}
      <div>
        {resource.tags.length > 0 || showTagInput ? (
          <div className="flex flex-wrap items-center gap-2">
            {resource.tags.map((tag) => (
              <span
                key={tag}
                className="group flex items-center gap-1 px-3 py-1 rounded-full bg-[#F0EBE0] text-[#1A1A1A] text-xs font-medium"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {showTagInput ? (
              <input
                autoFocus
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTag();
                  if (e.key === "Escape") setShowTagInput(false);
                }}
                onBlur={addTag}
                placeholder="Tag name..."
                className="h-7 px-3 text-xs border border-[#E8E2D9] rounded-full bg-white focus:outline-none focus:ring-1 focus:ring-[#C75B2A]/40"
              />
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="w-7 h-7 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowTagInput(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[#FDF3E3] text-sm font-medium text-[#1A1A1A] hover:bg-[#FBE9CD] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Tags to this Resource
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#C75B2A]" />
          </button>
        )}
      </div>

      {/* Description */}
      {resource.description && (
        <div>
          <p className="text-sm text-[#6B6B6B] leading-relaxed">
            {resource.description}
          </p>
        </div>
      )}

      {/* Info Grid */}
      <div>
        <InfoRow label="Type" value={capitalize(resource.type)} />
        <InfoRow
          label="Price"
          value={resource.price || "No price provided yet"}
        />
        {resource.type !== "partner" && resource.hours && (
          <InfoRow label="Hours" value={resource.hours} />
        )}
        <InfoRow label="Phone" value={resource.phone} />
        <InfoRow label="Address" value={resource.address} />
        <InfoRow label="Google Maps" value={resource.googleMapsUrl} />
        <InfoRow label="Website" value={resource.website} />
        {resource.agentBookingLink && (
          <InfoRow
            label="Agent Booking Link"
            value={resource.agentBookingLink}
          />
        )}
        {resource.type === "partner" && (
          <>
            <InfoRow
              label="Partner Type"
              value={resource.partnerType || "No partner role provided yet"}
            />
            <InfoRow label="URL Link" value={resource.urlLink} />
          </>
        )}
      </div>

      {/* Images */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Images</h3>
          <span className="text-xs text-[#6B6B6B]">
            {resource.images.length}/5 Uploaded
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => {
            const img = resource.images[i];
            return (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden",
                  img ? "border-transparent" : "border-[#E8E2D9]"
                )}
              >
                {img ? (
                  <div className="relative group w-full h-full">
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        const updated = resource.images.filter(
                          (_, idx) => idx !== i
                        );
                        updateResource(resource.id, { images: updated });
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button className="w-full h-full flex items-center justify-center text-[#6B6B6B] hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
