"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Pencil,
  Trash2,
  Power,
  Info,
  FileText,
  Package,
  Download,
  X,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  updateWorkspaceSkill,
  deleteWorkspaceSkill,
  toggleWorkspaceSkill,
} from "@/lib/actions/skills";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettingsContext } from "../context";
import type { WorkspaceSkill, SkillAsset } from "@/lib/types";
import { cn } from "@/lib/utils";

function SkillRow({
  skill,
  isAdmin,
  onEdit,
  onDelete,
  onToggle,
}: {
  skill: WorkspaceSkill;
  isAdmin: boolean;
  onEdit: (
    skill: WorkspaceSkill,
    name: string,
    description: string,
    content: string
  ) => Promise<void>;
  onDelete: (skill: WorkspaceSkill) => Promise<void>;
  onToggle: (skill: WorkspaceSkill) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editName, setEditName] = useState(skill.name);
  const [editDescription, setEditDescription] = useState(skill.description);
  const [editContent, setEditContent] = useState(skill.content);
  const [isSaving, setIsSaving] = useState(false);
  const [assets, setAssets] = useState<
    Array<SkillAsset & { downloadUrl: string }>
  >([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  const parsedAssets: SkillAsset[] = skill.assets
    ? JSON.parse(skill.assets)
    : [];

  const handleSave = async () => {
    if (!editName.trim() || !editDescription.trim() || !editContent.trim())
      return;
    setIsSaving(true);
    try {
      await onEdit(
        skill,
        editName.trim(),
        editDescription.trim(),
        editContent.trim()
      );
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(skill.name);
    setEditDescription(skill.description);
    setEditContent(skill.content);
    setIsEditing(false);
  };

  const handleExpand = async () => {
    setIsExpanded(!isExpanded);

    // Load assets if expanding and not already loaded
    if (!isExpanded && parsedAssets.length > 0 && assets.length === 0) {
      setIsLoadingAssets(true);
      try {
        const res = await fetch(`/api/skills/${skill.id}/assets`);
        if (res.ok) {
          const data = await res.json();
          setAssets(data.assets);
        }
      } finally {
        setIsLoadingAssets(false);
      }
    }
  };

  if (isEditing) {
    return (
      <div className="px-6 py-4 border-b border-border last:border-b-0 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Name
          </label>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Skill name (e.g., code-review)"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            When to use (triggers)
          </label>
          <Input
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Describe when the AI should use this skill"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Instructions (markdown)
          </label>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Write the instructions for the AI to follow..."
            className="flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
          />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={
              isSaving ||
              !editName.trim() ||
              !editDescription.trim() ||
              !editContent.trim()
            }
          >
            <Check className="w-4 h-4 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-start justify-between px-6 py-4">
        <button
          onClick={handleExpand}
          className="flex-1 min-w-0 text-left flex items-start gap-2"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-medium",
                  skill.isEnabled ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {skill.name}
              </span>
              {!skill.isEnabled && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  Disabled
                </span>
              )}
              {parsedAssets.length > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {parsedAssets.length} asset{parsedAssets.length !== 1 && "s"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {skill.description}
            </p>
          </div>
        </button>
        {isAdmin && (
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={() => onToggle(skill)}
              className={cn(
                "p-1.5 rounded transition-colors",
                skill.isEnabled
                  ? "text-green-500 hover:text-green-600"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={skill.isEnabled ? "Disable skill" : "Enable skill"}
            >
              <Power className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
              title="Edit skill"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(skill)}
              className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors"
              title="Delete skill"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="px-6 pb-4 pt-0 space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              Instructions Preview
            </h4>
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
              {skill.content.slice(0, 1000)}
              {skill.content.length > 1000 && "..."}
            </pre>
          </div>

          {parsedAssets.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">
                Assets
              </h4>
              {isLoadingAssets ? (
                <p className="text-xs text-muted-foreground">
                  Loading assets...
                </p>
              ) : (
                <div className="space-y-1">
                  {assets.map((asset) => (
                    <a
                      key={asset.storageKey}
                      href={asset.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-primary hover:underline"
                    >
                      <Download className="w-3 h-3" />
                      {asset.filename}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ImportSkillForm({
  workspaceId,
  onImported,
}: {
  workspaceId: string;
  onImported: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("workspaceId", workspaceId);

        const res = await fetch("/api/skills/import", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to import skill");
        }

        onImported();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to import skill");
      } finally {
        setIsUploading(false);
      }
    },
    [workspaceId, onImported]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.zip"
          onChange={handleChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Importing skill...</p>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              Drop a skill file here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports .md files or .zip skill packages
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <FileText className="w-4 h-4" />
          <span>.md - Single skill file</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Package className="w-4 h-4" />
          <span>.zip - Skill package with assets</span>
        </div>
      </div>
    </div>
  );
}

export default function SkillsSettingsPage() {
  const { workspace, skills, isAdmin, refreshSkills } = useSettingsContext();

  const handleEdit = async (
    skill: WorkspaceSkill,
    name: string,
    description: string,
    content: string
  ) => {
    await updateWorkspaceSkill(skill.id, { name, description, content });
    await refreshSkills();
  };

  const handleDelete = async (skill: WorkspaceSkill) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the skill "${skill.name}"?`
    );
    if (!confirmed) return;

    try {
      await deleteWorkspaceSkill(skill.id);
      await refreshSkills();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete skill");
    }
  };

  const handleToggle = async (skill: WorkspaceSkill) => {
    try {
      await toggleWorkspaceSkill(skill.id);
      await refreshSkills();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle skill");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">AI Skills</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import custom skills to extend AI assistant capabilities
        </p>
      </div>

      {/* Help Section */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Skill Format</p>
            <p>
              Skills use markdown files with YAML frontmatter. The frontmatter
              must include <code className="bg-muted px-1 rounded">name</code>{" "}
              and{" "}
              <code className="bg-muted px-1 rounded">description</code> fields.
            </p>
            <p className="mt-2">
              <strong>ZIP packages</strong> can include additional files in{" "}
              <code className="bg-muted px-1 rounded">references/</code>,{" "}
              <code className="bg-muted px-1 rounded">scripts/</code>, and{" "}
              <code className="bg-muted px-1 rounded">assets/</code> directories.
              Reference files are merged into the skill content.
            </p>
          </div>
        </div>
      </div>

      {/* Import Section */}
      {isAdmin && workspace && (
        <div className="mb-6">
          <ImportSkillForm
            workspaceId={workspace.id}
            onImported={refreshSkills}
          />
        </div>
      )}

      {/* Skills List */}
      <div className="rounded-lg border border-border bg-card">
        {skills.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No skills imported yet.{" "}
              {isAdmin ? "Import a skill to get started." : ""}
            </p>
          </div>
        ) : (
          skills.map((skill) => (
            <SkillRow
              key={skill.id}
              skill={skill}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
