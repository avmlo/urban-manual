"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useResourceLibraryStore } from "../lib/resource-store";
import type { Resource } from "../lib/types";

export function AddPartnerPanel() {
  const setPanelView = useResourceLibraryStore((s) => s.setPanelView);
  const addResource = useResourceLibraryStore((s) => s.addResource);

  const [name, setName] = useState("");
  const [partnerType, setPartnerType] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [urlLink, setUrlLink] = useState("");
  const [tags, setTags] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;

    const partner: Resource = {
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      type: "partner",
      description: "",
      address: address.trim(),
      phone: phone.trim(),
      website: "",
      googleMapsUrl: "",
      agentBookingLink: "",
      price: "",
      hours: "",
      partnerType: partnerType.trim(),
      urlLink: urlLink.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      images: [],
      affiliates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lat: null,
      lng: null,
      hasUnreadUpdate: false,
    };

    addResource(partner);
    setPanelView("list");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E2D9]">
        <h2 className="text-base font-semibold text-[#1A1A1A]">
          Add Partner
        </h2>
        <button
          onClick={() => setPanelView("list")}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-[#6B6B6B]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <Field label="Name" value={name} onChange={setName} required />
        <Field
          label="Partner Type / Role"
          value={partnerType}
          onChange={setPartnerType}
          placeholder="e.g. DMC, Hotel Rep"
        />
        <Field label="Address" value={address} onChange={setAddress} />
        <Field label="Phone" value={phone} onChange={setPhone} />
        <Field
          label="URL Link"
          value={urlLink}
          onChange={setUrlLink}
          placeholder="https://..."
        />
        <Field
          label="Tags"
          value={tags}
          onChange={setTags}
          placeholder="Comma-separated tags"
        />
      </div>

      <div className="px-5 py-3 border-t border-[#E8E2D9]">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full h-10 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Add Partner
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#6B6B6B] mb-1">
        {label}
        {required && <span className="text-[#C75B2A] ml-0.5">*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 text-sm border border-[#E8E2D9] rounded-lg bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C75B2A]/30"
      />
    </div>
  );
}
