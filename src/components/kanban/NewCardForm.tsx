"use client";

import { useState, useRef, useEffect } from "react";

interface NewCardFormProps {
  columnId: string;
  boardId: string;
  onCreated: () => void;
  onCancel: () => void;
}

export function NewCardForm({ columnId, boardId, onCreated, onCancel }: NewCardFormProps) {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await fetch("/api/kanban/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column_id: columnId, board_id: boardId, title: trimmed }),
      });
      onCreated();
    } catch (err) {
      console.error("Failed to create card:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        placeholder="Título do card..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
          if (e.key === "Escape") onCancel();
        }}
        disabled={creating}
        style={{
          width: "100%",
          padding: "0.5rem 0.625rem",
          borderRadius: "0.375rem",
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          fontSize: "13px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.375rem" }}>
        <button
          onClick={handleCreate}
          disabled={creating || !title.trim()}
          style={{
            padding: "0.25rem 0.625rem",
            borderRadius: "0.25rem",
            backgroundColor: "var(--accent)",
            color: "var(--text-primary)",
            border: "none",
            cursor: creating || !title.trim() ? "not-allowed" : "pointer",
            fontSize: "12px",
            fontWeight: 600,
            opacity: creating || !title.trim() ? 0.5 : 1,
          }}
        >
          {creating ? "..." : "Criar"}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "0.25rem 0.625rem",
            borderRadius: "0.25rem",
            backgroundColor: "transparent",
            color: "var(--text-muted)",
            border: "none",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
