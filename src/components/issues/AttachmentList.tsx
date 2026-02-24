"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Plus, Loader2, AlertCircle, Grid2x2, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachmentItem } from "./AttachmentItem";
import { AttachmentTableRow } from "./AttachmentTableRow";
import { AttachmentPreview } from "./AttachmentPreview";
import {
  useIssueAttachments,
  useUploadAttachment,
  useDeleteAttachment,
} from "@/lib/hooks";
import {
  validateFile,
  getAllowedExtensions,
  getAllowedMimeTypesString,
} from "@/lib/storage/file-validation";
import type { AttachmentWithUrl, IssueWithLabels } from "@/lib/types";

type AttachmentView = "table" | "grid";

interface AttachmentListProps {
  issue: IssueWithLabels;
  className?: string;
}

export function AttachmentList({ issue, className }: AttachmentListProps) {
  const [view, setView] = useState<AttachmentView>("table");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<AttachmentWithUrl | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments = [], isLoading } = useIssueAttachments(issue.id);
  const uploadMutation = useUploadAttachment(issue.id);
  const deleteMutation = useDeleteAttachment(issue.id);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        const validationError = validateFile({
          type: file.type,
          size: file.size,
          name: file.name,
        });

        if (validationError) {
          setError(validationError);
          continue;
        }

        try {
          await uploadMutation.mutateAsync(file);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to upload file"
          );
        }
      }
    },
    [uploadMutation]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleFiles]
  );

  const handleDelete = useCallback(
    async (attachmentId: string) => {
      setDeletingId(attachmentId);
      try {
        await deleteMutation.mutateAsync(attachmentId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete attachment"
        );
      } finally {
        setDeletingId(null);
      }
    },
    [deleteMutation]
  );

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={cn("space-y-2", className)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={`${getAllowedMimeTypesString()},${getAllowedExtensions()}`}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header row: label + actions */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          Attachments
        </label>
        <div className="flex items-center gap-0.5">
          {uploadMutation.isPending ? (
            <div className="p-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <button
              onClick={openFilePicker}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Add attachment"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          {attachments.length > 0 && (
            <>
              <button
                onClick={() => setView("table")}
                className={cn(
                  "p-1 rounded transition-colors",
                  view === "table"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Table view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "p-1 rounded transition-colors",
                  view === "grid"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Grid view"
              >
                <Grid2x2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-destructive hover:text-destructive/80"
          >
            &times;
          </button>
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-primary bg-primary/5 rounded-md text-sm text-primary">
          <Upload className="w-4 h-4" />
          <span>Drop files here</span>
        </div>
      )}

      {/* Attachment table view */}
      {attachments.length > 0 && view === "table" && !isDragging && (
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                <th className="text-left font-medium px-2 py-1.5">Name</th>
                <th className="text-left font-medium px-2 py-1.5 w-20">Size</th>
                <th className="text-left font-medium px-2 py-1.5 w-20">Date</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {attachments.map((attachment) => (
                <AttachmentTableRow
                  key={attachment.id}
                  attachment={attachment}
                  onPreview={() => setPreviewAttachment(attachment)}
                  onDelete={() => handleDelete(attachment.id)}
                  isDeleting={deletingId === attachment.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Attachment grid view */}
      {attachments.length > 0 && view === "grid" && !isDragging && (
        <div className="grid grid-cols-3 gap-2">
          {attachments.map((attachment) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              onPreview={() => setPreviewAttachment(attachment)}
              onDelete={() => handleDelete(attachment.id)}
              isDeleting={deletingId === attachment.id}
            />
          ))}
        </div>
      )}

      {/* Loading state */}
      {isLoading && attachments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Loading attachments...
        </p>
      )}

      {/* Preview modal */}
      <AttachmentPreview
        attachment={previewAttachment}
        open={!!previewAttachment}
        onOpenChange={(open) => !open && setPreviewAttachment(null)}
      />
    </div>
  );
}
