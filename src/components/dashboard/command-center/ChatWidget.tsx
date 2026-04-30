"use client";

import { useState, useEffect, useRef, FormEvent, useCallback, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { getProjectMessages, sendMessageWithAttachments } from "@/app/actions/messages";
import type { Attachment, Message as PrismaMessage } from "@prisma/client";

interface MessageWithSender extends PrismaMessage {
  sender: { id: string; name: string | null; image: string | null } | null;
  attachments: Attachment[];
}

interface ChatWidgetProps {
  projectId: string;
  currentUserId: string;
}

export default function ChatWidget({ projectId, currentUserId }: ChatWidgetProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async ({ manual = false }: { manual?: boolean } = {}) => {
    if (manual) setRefreshing(true);
    setLoadError(null);
    try {
      const data = await getProjectMessages(projectId);
      setMessages(data as MessageWithSender[]);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error("Failed to load messages:", err);
      setLoadError("Unable to refresh messages. Please try again.");
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, [projectId]);

  const handleManualRefresh = useCallback(async () => {
    await loadMessages({ manual: true });
    router.refresh();
  }, [loadMessages, router]);

  useEffect(() => {
    loadMessages();
    // Basic polling — refresh every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if ((!newMessage.trim() && selectedFiles.length === 0) || sending) return;

    setSending(true);
    setSendError(null);
    try {
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("content", newMessage);
      selectedFiles.forEach((file) => formData.append("attachments", file));

      const result = await sendMessageWithAttachments(formData);
      if (!result.success) {
        setSendError(result.error || "Unable to send message.");
        return;
      }

      setNewMessage("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadMessages();
      router.refresh();
    } catch (err) {
      console.error("Failed to send message:", err);
      setSendError("Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  function handleFilesChanged(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 5);
    setSelectedFiles(files);
    setSendError(null);
  }

  function removeSelectedFile(fileName: string) {
    const remaining = selectedFiles.filter((file) => file.name !== fileName);
    setSelectedFiles(remaining);
    if (remaining.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function formatBytes(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function formatTime(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  }

  function formatRefreshTime(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  }

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: MessageWithSender[] }[] = [];
  let currentDate = "";
  messages.forEach((msg) => {
    const msgDate = formatDate(msg.created_at);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
        <h3 className="text-lg font-bold font-headline text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">
            chat_bubble
          </span>
          Project Messages
        </h3>
        <div className="flex items-center gap-3">
          {lastRefreshedAt && (
            <p className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Updated {formatRefreshTime(lastRefreshedAt)}
            </p>
          )}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-md border border-outline-variant/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-wait disabled:opacity-60"
            title={lastRefreshedAt ? `Last updated ${formatRefreshTime(lastRefreshedAt)}` : "Refresh messages"}
          >
            <span className={`material-symbols-outlined text-[14px] ${refreshing ? "animate-spin" : ""}`}>
              {refreshing ? "sync" : "refresh"}
            </span>
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
        {loadError && (
          <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-xs font-bold text-error">
            {loadError}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-on-surface-variant text-sm">
              Loading messages...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <span className="material-symbols-outlined text-on-surface-variant/30 text-5xl">
              forum
            </span>
            <p className="text-on-surface-variant text-sm">
              No messages yet. Start the conversation below.
            </p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date Divider */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 border-t border-outline-variant/20" />
                <span className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">
                  {group.date}
                </span>
                <div className="flex-1 border-t border-outline-variant/20" />
              </div>

              {/* Messages */}
              <div className="space-y-3">
                {group.messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId;
                  const isSystem = msg.is_system_message;

                  if (isSystem) {
                    return (
                      <div
                        key={msg.id}
                        className="flex justify-center"
                      >
                        <span className="text-xs text-on-surface-variant bg-surface-container-low px-4 py-1.5 rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-3 ${
                        isMine ? "flex-row-reverse" : ""
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center shrink-0 overflow-hidden">
                        {msg.sender?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={msg.sender.image}
                            alt={msg.sender.name || "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-on-surface-variant text-sm">
                            person
                          </span>
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? "bg-primary text-on-primary rounded-tr-md"
                            : "bg-surface-container-high text-on-surface rounded-tl-md"
                        }`}
                      >
                        {!isMine && msg.sender?.name && (
                          <p className="text-xs font-bold mb-1 opacity-70">
                            {msg.sender.name}
                          </p>
                        )}
                        <p>{msg.content}</p>
                        {msg.attachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {msg.attachments.map((attachment) => (
                              <a
                                key={attachment.id}
                                href={`/api/attachments/${attachment.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                                  isMine
                                    ? "border-on-primary/20 bg-on-primary/10 text-on-primary hover:bg-on-primary/15"
                                    : "border-outline-variant/30 bg-surface-container-low text-on-surface hover:border-primary/40"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[15px]">attach_file</span>
                                <span className="min-w-0 flex-1 truncate font-bold">{attachment.name}</span>
                                {attachment.size_bytes && (
                                  <span className="shrink-0 opacity-70">{formatBytes(attachment.size_bytes)}</span>
                                )}
                              </a>
                            ))}
                          </div>
                        )}
                        <p
                          className={`text-[10px] mt-1 text-right ${
                            isMine ? "text-on-primary/60" : "text-on-surface-variant"
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="px-6 py-4 border-t border-outline-variant/30"
      >
        {selectedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedFiles.map((file) => (
              <button
                key={`${file.name}-${file.size}`}
                type="button"
                onClick={() => removeSelectedFile(file.name)}
                className="flex max-w-full items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:border-error/40 hover:text-error"
                title="Remove attachment"
              >
                <span className="material-symbols-outlined text-[14px]">attach_file</span>
                <span className="max-w-[180px] truncate">{file.name}</span>
                <span className="material-symbols-outlined text-[13px]">close</span>
              </button>
            ))}
          </div>
        )}
        {sendError && (
          <p className="mb-3 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs font-medium text-error">
            {sendError}
          </p>
        )}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.csv,.json,.zip,.log,application/pdf,image/*,text/*"
            onChange={handleFilesChanged}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-surface-container-low border border-outline-variant/30 text-on-surface-variant p-3 rounded-xl transition-colors hover:border-primary/40 hover:text-primary"
            title="Attach files"
          >
            <span className="material-symbols-outlined">attach_file</span>
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending}
            className="bg-primary hover:bg-primary/90 text-on-primary p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined">
              {sending ? "sync" : "send"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
