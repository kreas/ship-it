"use client";

import { createElement } from "react";
import {
  FileText,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  MoreHorizontal,
  Download,
  Trash2,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  isImageType,
  isPdfType,
  formatFileSize,
} from "@/lib/storage/file-validation";
import type { AttachmentWithUrl } from "@/lib/types";

interface AttachmentTableRowProps {
  attachment: AttachmentWithUrl;
  onPreview: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

function isMarkdownType(mimeType: string): boolean {
  return mimeType === "text/markdown" || mimeType === "text/x-markdown";
}

function getFileIcon(mimeType: string): LucideIcon {
  if (isImageType(mimeType)) return ImageIcon;
  if (isPdfType(mimeType)) return FileText;
  if (isMarkdownType(mimeType)) return FileCode;
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("ms-excel")
  ) {
    return FileSpreadsheet;
  }
  return File;
}

function getIconColor(mimeType: string): string {
  if (isImageType(mimeType)) return "text-blue-500";
  if (isPdfType(mimeType)) return "text-red-500";
  if (isMarkdownType(mimeType)) return "text-purple-500";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("ms-excel")
  ) {
    return "text-green-500";
  }
  return "text-muted-foreground";
}

function formatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function AttachmentTableRow({
  attachment,
  onPreview,
  onDelete,
  isDeleting = false,
}: AttachmentTableRowProps) {
  const IconComponent = getFileIcon(attachment.mimeType);
  const iconColor = getIconColor(attachment.mimeType);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(attachment.url, "_blank");
  };

  return (
    <tr
      className={cn(
        "group border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer",
        isDeleting && "opacity-50 pointer-events-none"
      )}
      onClick={onPreview}
    >
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {createElement(IconComponent, {
            className: cn("w-4 h-4 shrink-0", iconColor),
          })}
          <span className="truncate" title={attachment.filename}>
            {attachment.filename}
          </span>
        </div>
      </td>
      <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
        {formatFileSize(attachment.size)}
      </td>
      <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
        {formatDate(attachment.createdAt)}
      </td>
      <td className="px-1 py-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "p-0.5 rounded text-muted-foreground",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                "hover:bg-accent"
              )}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onPreview()}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
