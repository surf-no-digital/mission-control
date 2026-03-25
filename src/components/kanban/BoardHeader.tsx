"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Check, X } from "lucide-react";

interface Board {
  id: string;
  name: string;
  description: string;
}

interface BoardHeaderProps {
  board: Board;
  onUpdate: (updated: Partial<Board>) => void;
}

export function BoardHeader({ board, onUpdate }: BoardHeaderProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(board.name);

  const saveTitle = async () => {
    const name = editName.trim();
    if (!name || name === board.name) {
      setEditing(false);
      setEditName(board.name);
      return;
    }
    try {
      await fetch(`/api/kanban/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      onUpdate({ name });
    } catch (err) {
      console.error("Failed to update board:", err);
    }
    setEditing(false);
  };

  return (
    <div
      style={{
        padding: "1rem 1.5rem",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--card)",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        flexShrink: 0,
      }}
    >
      <button
        onClick={() => router.push("/kanban/boards")}
        title="Todos os boards"
        style={{
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          padding: "0.25rem 0.5rem",
          borderRadius: "0.375rem",
          fontSize: "12px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        <LayoutGrid className="w-4 h-4" />
        <span>Boards</span>
      </button>

      <div style={{ flex: 1 }}>
        {editing ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setEditing(false);
                  setEditName(board.name);
                }
              }}
              autoFocus
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                fontFamily: "var(--font-heading)",
                color: "var(--text-primary)",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--accent)",
                borderRadius: "0.375rem",
                padding: "0.25rem 0.5rem",
                outline: "none",
              }}
            />
            <button
              onClick={saveTitle}
              style={{ background: "none", border: "none", color: "var(--success)", cursor: "pointer" }}
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setEditing(false); setEditName(board.name); }}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            <h1
              onDoubleClick={() => setEditing(true)}
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                fontFamily: "var(--font-heading)",
                color: "var(--text-primary)",
                cursor: "pointer",
                letterSpacing: "-0.5px",
              }}
              title="Clique duas vezes para editar"
            >
              {board.name}
            </h1>
            {board.description && (
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "0.125rem" }}>
                {board.description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
