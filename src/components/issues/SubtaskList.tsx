"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusSelect } from "./properties/StatusSelect";
import { PrioritySelect } from "./properties/PrioritySelect";
import { PriorityIcon } from "./PriorityIcon";
import { useBoardContext } from "@/components/board/context";
import { useIssueSubtasks, useSubtaskOperations } from "@/lib/hooks";
import { STATUS, type Status, type Priority } from "@/lib/design-tokens";
import type { IssueWithLabels, UpdateIssueInput } from "@/lib/types";

interface SubtaskListProps {
  issue: IssueWithLabels;
  className?: string;
}

interface SubtaskItemProps {
  subtask: IssueWithLabels;
  onUpdate: (data: UpdateIssueInput) => void;
  onDelete: () => void;
  onConvertToIssue: () => void;
}

function SubtaskItem({
  subtask,
  onUpdate,
  onDelete,
  onConvertToIssue,
}: SubtaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(subtask.title);
  const [description, setDescription] = useState(subtask.description || "");

  const isDone =
    subtask.status === STATUS.DONE || subtask.status === STATUS.CANCELED;

  const handleToggleStatus = () => {
    onUpdate({
      status: isDone ? STATUS.TODO : STATUS.DONE,
    });
  };

  const handleTitleBlur = () => {
    if (title.trim() && title !== subtask.title) {
      onUpdate({ title: title.trim() });
    }
    setIsEditing(false);
  };

  const handleDescriptionBlur = () => {
    if (description !== (subtask.description || "")) {
      onUpdate({ description: description || undefined });
    }
  };

  return (
    <div
      className={cn(
        "group border border-border/50 rounded-md",
        isExpanded && "bg-muted/30"
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 hover:bg-accent rounded text-muted-foreground"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Status checkbox */}
        <button
          onClick={handleToggleStatus}
          className={cn(
            "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
            isDone
              ? "bg-status-done border-status-done"
              : "border-muted-foreground hover:border-primary"
          )}
        >
          {isDone && (
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>

        {/* Identifier */}
        <span className="text-[10px] font-medium text-muted-foreground shrink-0">
          {subtask.identifier}
        </span>

        {/* Priority icon */}
        <PriorityIcon priority={subtask.priority as Priority} size="sm" />

        {/* Title */}
        {isEditing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleTitleBlur();
              } else if (e.key === "Escape") {
                setTitle(subtask.title);
                setIsEditing(false);
              }
            }}
            className={cn(
              "flex-1 text-sm bg-transparent border-none outline-none",
              "focus:ring-0"
            )}
            autoFocus
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={cn(
              "flex-1 text-sm truncate cursor-text",
              isDone && "line-through text-muted-foreground"
            )}
          >
            {subtask.title}
          </span>
        )}

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-accent rounded text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onConvertToIssue}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Convert to issue
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete subtask
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/50">
          {/* Properties row */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Status</span>
              <StatusSelect
                value={subtask.status as Status}
                onChange={(status) => onUpdate({ status })}
                className="w-[140px] h-7"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                Priority
              </span>
              <PrioritySelect
                value={subtask.priority as Priority}
                onChange={(priority) => onUpdate({ priority })}
                className="w-[140px] h-7"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              onBlur={handleDescriptionBlur}
              placeholder="Add description..."
              minHeight={60}
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function SubtaskList({ issue, className }: SubtaskListProps) {
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Get workspaceId from context instead of props
  const { board } = useBoardContext();
  const workspaceId = board.id;

  const { data: subtasks = [], isLoading } = useIssueSubtasks(issue.id);
  const { createSubtask, updateSubtask, removeSubtask, promoteToIssue } =
    useSubtaskOperations(issue.id, workspaceId);

  useEffect(() => {
    if (isAddingSubtask && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingSubtask]);

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    await createSubtask.mutateAsync({
      columnId: issue.columnId,
      title: newSubtaskTitle.trim(),
    });

    setNewSubtaskTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubtask();
    } else if (e.key === "Escape") {
      setIsAddingSubtask(false);
      setNewSubtaskTitle("");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Subtask list */}
      {subtasks.length > 0 && (
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onUpdate={(data) =>
                updateSubtask.mutate({ subtaskId: subtask.id, data })
              }
              onDelete={() => removeSubtask.mutate(subtask.id)}
              onConvertToIssue={() =>
                promoteToIssue.mutate({
                  subtaskId: subtask.id,
                  columnId: issue.columnId,
                })
              }
            />
          ))}
        </div>
      )}

      {/* Add subtask input */}
      {isAddingSubtask ? (
        <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-muted/30">
          <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!newSubtaskTitle.trim()) {
                setIsAddingSubtask(false);
              }
            }}
            placeholder="Subtask title..."
            className={cn(
              "flex-1 text-sm bg-transparent border-none outline-none",
              "focus:ring-0 placeholder:text-muted-foreground"
            )}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAddingSubtask(false);
              setNewSubtaskTitle("");
            }}
            className="h-6 px-2 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAddSubtask}
            disabled={!newSubtaskTitle.trim() || createSubtask.isPending}
            className="h-6 px-2 text-xs"
          >
            Add
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingSubtask(true)}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground",
            "hover:bg-accent/50 rounded-md transition-colors"
          )}
        >
          <Plus className="w-4 h-4" />
          Add subtask
        </button>
      )}

      {/* Loading state */}
      {isLoading && subtasks.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Loading subtasks...
        </p>
      )}
    </div>
  );
}
