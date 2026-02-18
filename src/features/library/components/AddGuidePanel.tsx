"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useResourceLibraryStore } from "../lib/resource-store";
import type { Resource } from "../lib/types";

export function AddGuidePanel() {
  const setPanelView = useResourceLibraryStore((s) => s.setPanelView);
  const addResource = useResourceLibraryStore((s) => s.addResource);

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;

    const guide: Resource = {
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      type: "guide",
      description: bio.trim(),
      address: location.trim(),
      phone: phone.trim(),
      website: "",
      googleMapsUrl: "",
      agentBookingLink: "",
      price: "",
      hours: "",
      partnerType: "",
      urlLink: "",
      tags: specialty.trim() ? [specialty.trim()] : [],
      images: [],
      affiliates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lat: null,
      lng: null,
      hasUnreadUpdate: false,
    };

    addResource(guide);
    setPanelView("list");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E2D9]">
        <h2 className="text-base font-semibold text-[#1A1A1A]">Add Guide</h2>
        <button
          onClick={() => setPanelView("list")}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-[#6B6B6B]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <Field label="Name" value={name} onChange={setName} required />
        <Field label="Specialty" value={specialty} onChange={setSpecialty} />
        <Field label="Location" value={location} onChange={setLocation} />
        <Field label="Phone" value={phone} onChange={setPhone} />
        <div>
          <label className="block text-xs font-medium text-[#6B6B6B] mb-1">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-[#E8E2D9] rounded-lg bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#C75B2A]/30"
          />
        </div>
      </div>

      <div className="px-5 py-3 border-t border-[#E8E2D9]">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full h-10 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Add Guide
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
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
        className="w-full h-10 px-3 text-sm border border-[#E8E2D9] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#C75B2A]/30"
      />
    </div>
  );
}
