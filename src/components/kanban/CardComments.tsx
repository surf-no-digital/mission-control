"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Send } from "lucide-react";

interface Comment {
  id: string;
  card_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

interface CardCommentsProps {
  cardId: string;
}

export function CardComments({ cardId }: CardCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/kanban/cards/${cardId}/comments`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [cardId]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await fetch(`/api/kanban/cards/${cardId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_id: "diogo",
          author_name: "Diogo",
          body: trimmed,
        }),
      });
      setBody("");
      fetchComments();
    } catch (err) {
      console.error("Failed to send comment:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h3
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: "0.5rem",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        <MessageSquare className="w-3.5 h-3.5 inline-block mr-1 mb-0.5" />
        Comentários ({comments.length})
      </h3>

      {/* Comments list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "0.75rem" }}>
        {comments.map((comment) => (
          <div
            key={comment.id}
            style={{
              padding: "0.625rem 0.75rem",
              borderRadius: "0.5rem",
              backgroundColor: "var(--bg)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.375rem",
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                {comment.author_name}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {new Date(comment.created_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
              {comment.body}
            </p>
          </div>
        ))}
      </div>

      {/* New comment */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          placeholder="Escreva um comentário..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={sending}
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            borderRadius: "0.375rem",
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            fontSize: "13px",
            outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.375rem",
            backgroundColor: "var(--accent)",
            color: "var(--text-primary)",
            border: "none",
            cursor: sending || !body.trim() ? "not-allowed" : "pointer",
            opacity: sending || !body.trim() ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
