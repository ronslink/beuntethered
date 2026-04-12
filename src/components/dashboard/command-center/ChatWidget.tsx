"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getProjectMessages, sendMessage } from "@/app/actions/messages";
import type { Message as PrismaMessage } from "@prisma/client";

interface MessageWithSender extends PrismaMessage {
  sender: { id: string; name: string | null; image: string | null } | null;
}

interface ChatWidgetProps {
  projectId: string;
  currentUserId: string;
}

export default function ChatWidget({ projectId, currentUserId }: ChatWidgetProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    try {
      const data = await getProjectMessages(projectId);
      setMessages(data as MessageWithSender[]);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
    // Basic polling — refresh every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(projectId, newMessage);
      setNewMessage("");
      await loadMessages();
      router.refresh();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }

  function formatTime(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
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
        <button
          onClick={loadMessages}
          className="text-on-surface-variant hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest"
        >
          Refresh
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
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
        className="flex items-center gap-3 px-6 py-4 border-t border-outline-variant/30"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-surface-container-low border border-outline-variant/30 focus:border-primary px-4 py-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="bg-primary hover:bg-primary/90 text-on-primary p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined">
            {sending ? "sync" : "send"}
          </span>
        </button>
      </form>
    </div>
  );
}
