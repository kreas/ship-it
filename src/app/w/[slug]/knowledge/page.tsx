"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  Search,
  FolderPlus,
  FilePlus2,
  Save,
  Trash2,
  RefreshCw,
  BookOpen,
  Layers,
  Code2,
} from "lucide-react";
import { getWorkspaceBySlug } from "@/lib/actions/workspace";
import { createKnowledgeImageUpload } from "@/lib/actions/knowledge";
import {
  useCreateKnowledgeDocument,
  useCreateKnowledgeFolder,
  useDeleteKnowledgeDocument,
  useKnowledgeDocument,
  useKnowledgeDocuments,
  useKnowledgeFolders,
  useKnowledgeTags,
  useUpdateKnowledgeDocument,
} from "@/lib/hooks";
import { LexicalMarkdownEditor } from "@/components/ui/lexical-markdown-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function KnowledgeBasePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [lastLoadedDocumentId, setLastLoadedDocumentId] = useState<string | null>(null);
  const [isSourceOpen, setIsSourceOpen] = useState(false);

  useEffect(() => {
    if (!params.slug) return;

    let isMounted = true;
    setIsLoadingWorkspace(true);

    Promise.all([getWorkspaceBySlug(params.slug)]).then(([workspace]) => {
      if (!isMounted) return;
      setWorkspace(workspace ?? null);
      setWorkspaceId(workspace?.id ?? null);
      setIsLoadingWorkspace(false);
    });

    return () => {
      isMounted = false;
    };
  }, [params.slug]);

  const foldersQuery = useKnowledgeFolders(workspaceId);
  const documentsQuery = useKnowledgeDocuments({
    workspaceId,
    folderId: selectedFolderId,
    tag: selectedTag,
    query: searchQuery || null,
  });
  const tagsQuery = useKnowledgeTags(workspaceId);
  const selectedDocumentQuery = useKnowledgeDocument(selectedDocumentId);

  const createFolder = useCreateKnowledgeFolder(workspaceId ?? "");
  const createDocument = useCreateKnowledgeDocument(workspaceId ?? "");
  const updateDocument = useUpdateKnowledgeDocument(workspaceId ?? "");
  const deleteDocument = useDeleteKnowledgeDocument(workspaceId ?? "");

  useEffect(() => {
    const doc = selectedDocumentQuery.data;
    if (!doc) return;
    if (doc.id === lastLoadedDocumentId) return;

    setEditorTitle(doc.title);
    setEditorContent(doc.content);
    setLastLoadedDocumentId(doc.id);
  }, [selectedDocumentQuery.data, lastLoadedDocumentId]);

  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const documents = documentsQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const selectedDoc = selectedDocumentQuery.data;

  const canSave =
    !!selectedDocumentId &&
    !!editorTitle.trim() &&
    !!selectedDoc &&
    (editorTitle !== selectedDoc.title || editorContent !== selectedDoc.content);

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => a.path.localeCompare(b.path));
  }, [folders]);

  const handleCreateFolder = async () => {
    if (!workspaceId) return;
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;

    try {
      await createFolder.mutateAsync({
        name: name.trim(),
        parentFolderId: selectedFolderId,
      });
      toast.success("Folder created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create folder");
    }
  };

  const handleCreateDocument = async () => {
    if (!workspaceId) return;

    const title = window.prompt("Document title", "Untitled Document");
    if (!title?.trim()) return;

    try {
      const doc = await createDocument.mutateAsync({
        title: title.trim(),
        content: "",
        folderId: selectedFolderId,
      });
      setSelectedDocumentId(doc.id);
      toast.success("Document created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create document");
    }
  };

  const handleSaveDocument = async () => {
    if (!selectedDocumentId) return;
    try {
      await updateDocument.mutateAsync({
        documentId: selectedDocumentId,
        title: editorTitle.trim(),
        content: editorContent,
      });
      toast.success("Document saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save document");
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocumentId) return;
    const confirmed = window.confirm("Delete this document?");
    if (!confirmed) return;

    try {
      await deleteDocument.mutateAsync(selectedDocumentId);
      setSelectedDocumentId(null);
      setEditorTitle("");
      setEditorContent("");
      setLastLoadedDocumentId(null);
      toast.success("Document deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete document");
    }
  };

  const handleManualSync = async () => {
    if (!workspaceId) return;
    try {
      const response = await fetch("/api/knowledge/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to sync");
      }
      toast.success("AI Search sync started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync");
    }
  };

  const handleUploadImage = async (file: File): Promise<string> => {
    if (!workspaceId || !selectedDocumentId) {
      throw new Error("Create and select a document before uploading images");
    }

    try {
      const upload = await createKnowledgeImageUpload({
        workspaceId,
        documentId: selectedDocumentId,
        filename: file.name,
        mimeType: file.type || "image/png",
        size: file.size,
      });

      const uploadRes = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/png" },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image to R2");
      }

      toast.success("Image uploaded");
      return upload.imageMarkdownUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed";
      toast.error(message);
      throw new Error(message);
    }
  };

  if (isLoadingWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading workspace...
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Workspace not found
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-12 border-b border-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/w/${params.slug}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          {workspace ? (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
                <Layers className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-medium">{workspace.name}</span>
              <span className="text-muted-foreground">/</span>
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Knowledge</span>
            </div>
          ) : null}
        </div>
      </header>

      <div className="h-14 border-b border-border px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleCreateFolder}>
            <FolderPlus className="w-4 h-4 mr-1.5" />
            New Folder
          </Button>
          <Button size="sm" variant="outline" onClick={handleCreateDocument}>
            <FilePlus2 className="w-4 h-4 mr-1.5" />
            New Document
          </Button>
          <Button size="sm" variant="outline" onClick={handleManualSync}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Sync Index
          </Button>
        </div>
        <div className="w-[320px] relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
            placeholder="Search documents..."
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <aside className="w-64 border-r border-border p-3 space-y-4 overflow-auto">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Folders</p>
            <button
              className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                selectedFolderId === null ? "bg-accent" : "hover:bg-accent/60"
              }`}
              onClick={() => setSelectedFolderId(null)}
            >
              All Documents
            </button>
            {sortedFolders.map((folder) => (
              <button
                key={folder.id}
                className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                  selectedFolderId === folder.id ? "bg-accent" : "hover:bg-accent/60"
                }`}
                onClick={() => setSelectedFolderId(folder.id)}
              >
                {folder.name}
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
            <button
              className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                selectedTag === null ? "bg-accent" : "hover:bg-accent/60"
              }`}
              onClick={() => setSelectedTag(null)}
            >
              All Tags
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                  selectedTag === tag ? "bg-accent" : "hover:bg-accent/60"
                }`}
                onClick={() => setSelectedTag(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </aside>

        <aside className="w-80 border-r border-border p-3 overflow-auto">
          <p className="text-xs font-medium text-muted-foreground mb-2">Documents</p>
          <div className="space-y-1">
            {documents.map((doc) => (
              <button
                key={doc.id}
                className={`w-full text-left px-2 py-2 rounded ${
                  selectedDocumentId === doc.id ? "bg-accent" : "hover:bg-accent/60"
                }`}
                onClick={() => setSelectedDocumentId(doc.id)}
              >
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.tags.slice(0, 3).map((tag) => `#${tag}`).join(" ")}
                </p>
              </button>
            ))}
            {documents.length === 0 && (
              <p className="text-sm text-muted-foreground px-2 py-4">
                No documents found
              </p>
            )}
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex">
          {!selectedDocumentId ? (
            <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
              Select a document to edit
            </div>
          ) : (
            <div className="w-full min-w-0 flex flex-col">
              <div className="h-12 border-b border-border px-3 flex items-center gap-2">
                <Input
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  placeholder="Document title"
                  className="h-8"
                />
                <Button size="sm" variant="outline" onClick={() => setIsSourceOpen(true)}>
                  <Code2 className="w-4 h-4 mr-1.5" />
                  Source
                </Button>
                <Button size="sm" onClick={handleSaveDocument} disabled={!canSave}>
                  <Save className="w-4 h-4 mr-1.5" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={handleDeleteDocument}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 min-h-0 p-3 overflow-hidden">
                <LexicalMarkdownEditor
                  key={selectedDocumentId}
                  value={editorContent}
                  onChange={setEditorContent}
                  placeholder="Write markdown..."
                  className="h-full"
                  onUploadImage={handleUploadImage}
                />
              </div>
              {selectedDoc?.backlinks?.length ? (
                <div className="border-t border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Backlinks</p>
                  <div className="space-y-1">
                    {selectedDoc.backlinks.map((backlink) => (
                      <p key={backlink.id} className="text-sm">
                        {backlink.title}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              <Dialog open={isSourceOpen} onOpenChange={setIsSourceOpen}>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Markdown Source</DialogTitle>
                  </DialogHeader>
                  <textarea
                    readOnly
                    value={editorContent}
                    className="h-[60vh] w-full rounded-md border border-border bg-background p-3 font-mono text-xs leading-5"
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
