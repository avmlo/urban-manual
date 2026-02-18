"use client";

import { FileText, Upload, Plus, Trash2 } from "lucide-react";
import {
  useResourceLibraryStore,
  useSelectedResourceDocuments,
} from "../../lib/resource-store";

export function DocumentsTab() {
  const selectedResourceId = useResourceLibraryStore(
    (s) => s.selectedResourceId
  );
  const addDocument = useResourceLibraryStore((s) => s.addDocument);
  const deleteDocument = useResourceLibraryStore((s) => s.deleteDocument);
  const documents = useSelectedResourceDocuments();

  const handleUploadPlaceholder = () => {
    if (!selectedResourceId) return;
    // Placeholder: in production, this would open a file picker and upload to storage
    addDocument({
      id: `doc-${Date.now()}`,
      resourceId: selectedResourceId,
      fileName: `Document_${documents.length + 1}.pdf`,
      fileUrl: "#",
      uploadedAt: new Date().toISOString(),
    });
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-[#F0EBE0] flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-[#6B6B6B]" />
        </div>
        <p className="text-sm font-medium text-[#1A1A1A] mb-1">
          No documents yet.
        </p>
        <p className="text-xs text-[#6B6B6B] mb-4">
          Upload files to keep important documents organized.
        </p>

        {/* Upload area */}
        <button
          onClick={handleUploadPlaceholder}
          className="w-full max-w-xs flex flex-col items-center gap-2 p-6 border-2 border-dashed border-[#E8E2D9] rounded-lg hover:border-[#C75B2A]/40 hover:bg-[#FDF3E3]/30 transition-colors"
        >
          <Upload className="w-5 h-5 text-[#6B6B6B]" />
          <span className="text-xs text-[#6B6B6B]">
            Click to upload a document
          </span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#1A1A1A]">Documents</h3>
        <button
          onClick={handleUploadPlaceholder}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#E8E2D9] bg-white text-xs font-medium text-[#1A1A1A] hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Upload
        </button>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="group flex items-center gap-3 p-3 rounded-lg border border-[#E8E2D9] bg-white hover:border-gray-300 transition-colors"
          >
            <FileText className="w-5 h-5 text-[#C75B2A] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1A1A1A] truncate">
                {doc.fileName}
              </p>
              <p className="text-xs text-[#6B6B6B]">
                {new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={() => deleteDocument(doc.id)}
              className="p-1 rounded-md hover:bg-red-50 text-[#6B6B6B] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
