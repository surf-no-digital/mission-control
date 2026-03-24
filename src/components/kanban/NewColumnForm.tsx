"use client";

import { useState, useRef, useEffect } from "react";

const PRESET_COLORS = [
  "#6b7280", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6",
];

interface NewColumnFormProps {
  boardId: string;
  onCreated: () => void;
  onCancel: () => void;
}

export function NewColumnForm({ boardId, onCreated, onCancel }: NewColumnFormProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [wakeup, setWakeup] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await fetch(`/api/kanban/boards/${boardId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, color, wakeup_on_enter: wakeup ? 1 : 0 }),
      });
      onCreated();
    } catch (err) {
      console.error("Failed to create column:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        minWidth: "280px",
        padding: "1rem",
        borderRadius: "0.75rem",
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Nome da coluna..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
          if (e.key === "Escape") onCancel();
        }}
        style={{
          width: "100%",
          padding: "0.5rem 0.625rem",
          borderRadius: "0.375rem",
          backgroundColor: "var(--bg)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          fontSize: "13px",
          outline: "none",
          marginBottom: "0.75rem",
          boxSizing: "border-box",
        }}
      />

      {/* Color picker */}
      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "0.375rem" }}>
          Cor
        </label>
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "0.25rem",
                backgroundColor: c,
                border: color === c ? "2px solid var(--text-primary)" : "2px solid transparent",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Wakeup toggle */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "12px",
          color: "var(--text-secondary)",
          marginBottom: "0.75rem",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={wakeup}
          onChange={(e) => setWakeup(e.target.checked)}
          style={{ accentColor: "var(--accent)" }}
        />
        Wakeup agent ao entrar
      </label>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.375rem" }}>
        <button
          onClick={handleCreate}
          disabled={creating || !name.trim()}
          style={{
            padding: "0.375rem 0.75rem",
            borderRadius: "0.375rem",
            backgroundColor: "var(--accent)",
            color: "var(--text-primary)",
            border: "none",
            cursor: creating || !name.trim() ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: 600,
            opacity: creating || !name.trim() ? 0.5 : 1,
          }}
        >
          {creating ? "Criando..." : "Criar Coluna"}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "0.375rem 0.75rem",
            borderRadius: "0.375rem",
            backgroundColor: "transparent",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
