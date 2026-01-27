"use client";

import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatContext } from "./ChatContext";
import { groupChatsByDate } from "./chat-utils";

export function ChatSidebar() {
  const { chats, isLoadingChats, selectedChatId, selectChat, createNewChat, deleteChat } =
    useChatContext();

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    await deleteChat(chatId);
  };

  const groupedChats = groupChatsByDate(chats);

  return (
    <div className="flex flex-col h-full w-64 border-r border-border bg-muted/30 shrink-0">
      {/* Header with New Chat button */}
      <div className="p-3 border-b border-border">
        <button
          onClick={createNewChat}
          className={cn(
            "flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md text-sm",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors"
          )}
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoadingChats ? (
          <div className="flex items-center justify-center p-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No conversations yet.
            <br />
            Start a new chat!
          </div>
        ) : (
          <div className="p-2 space-y-4">
            {groupedChats.map((group) => (
              <div key={group.label}>
                <h3 className="px-2 mb-1 text-xs font-medium text-muted-foreground">
                  {group.label}
                </h3>
                <div className="space-y-0.5">
                  {group.chats.map((chat) => (
                    <div
                      key={chat.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectChat(chat.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectChat(chat.id);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-left cursor-pointer",
                        "hover:bg-muted group transition-colors",
                        selectedChatId === chat.id && "bg-muted"
                      )}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{chat.title}</span>
                      <button
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-opacity"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
