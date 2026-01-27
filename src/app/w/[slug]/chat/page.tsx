"use client";

import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Layers, MessageSquare } from "lucide-react";
import { ChatProvider, useChatContext } from "./_components/ChatContext";
import { ChatSidebar } from "./_components/ChatSidebar";
import { ChatPanel } from "./_components/ChatPanel";
import { AttachmentPreviewPanel } from "./_components/AttachmentPreviewPanel";

function ChatPageContent() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { workspace, isLoading, selectedChatId, chats, isPreviewOpen, isLoadingAttachment } =
    useChatContext();

  const handleBack = () => {
    router.push(`/w/${params.slug}`);
  };

  if (isLoading || !workspace) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 h-12 px-4 border-b border-border shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
            <Layers className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">{workspace.name}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>/</span>
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">Chat</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar />

        {/* Content area (chat + optional preview) */}
        <div className="flex flex-1 min-w-0">
          {/* Chat panel */}
          <div className={isPreviewOpen ? "w-1/2" : "flex-1"}>
            {selectedChatId ? (
              <ChatPanel key={selectedChatId} />
            ) : (
              <EmptyState hasChats={chats.length > 0} />
            )}
          </div>

          {/* Attachment preview panel */}
          {isPreviewOpen && (
            <div className="w-1/2">
              {isLoadingAttachment ? (
                <div className="flex items-center justify-center h-full border-l border-border">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <AttachmentPreviewPanel />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasChats }: { hasChats: boolean }) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <div className="text-center">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="mb-1">{hasChats ? "Select a conversation" : "No conversations yet"}</p>
        <p className="text-sm">Click &quot;New chat&quot; to start a conversation</p>
      </div>
    </div>
  );
}

export default function WorkspaceChatPage() {
  return (
    <ChatProvider>
      <ChatPageContent />
    </ChatProvider>
  );
}
