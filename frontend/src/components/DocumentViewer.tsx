"use client";

import { useEffect } from "react";
import { useBlobUrl } from '@/lib/useBlobUrl';

interface DocumentViewerProps {
  documentUrl: string;
  documentName: string;
  onClose: () => void;
}

export default function DocumentViewer({
  documentUrl,
  documentName,
  onClose,
}: DocumentViewerProps) {
  useEffect(() => {
    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+S, Ctrl+P, etc.
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "c" ||
          e.key === "s" ||
          e.key === "p" ||
          e.key === "a" ||
          e.key === "x")
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const { blobUrl, loading, error } = useBlobUrl(documentUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative w-full h-full max-w-6xl max-h-screen bg-white m-4 rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 truncate">
            {documentName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Document Viewer */}
        <div
          className="flex-1 overflow-hidden"
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
          }}
        >
          {error ? (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-red-500 font-bold">Failed to load document</p>
            </div>
          ) : loading || !blobUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-500 animate-pulse">Loading document...</p>
            </div>
          ) : (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              style={{
                pointerEvents: "auto",
                userSelect: "none",
              }}
              title={documentName}
            />
          )}
        </div>

        {/* Footer Warning */}
        <div className="p-3 bg-yellow-50 border-t border-yellow-200">
          <p className="text-sm text-yellow-800 text-center">
            ⚠️ This document is view-only. Copying, downloading, and printing
            are disabled.
          </p>
        </div>
      </div>
    </div>
  );
}
