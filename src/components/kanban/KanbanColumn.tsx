"use client";

import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";
import { NewCardForm } from "./NewCardForm";
import { MoreHorizontal, Plus, Pencil, Trash2, X, Check } from "lucide-react";

interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  color: string;
  wakeup_on_enter: number;
}

interface Card {
  id: string;
  column_id: string;
  board_id: string;
  title: string;
  description: string;
  position: number;
  priority: string;
  assignee_agent_id: string | null;
  labels: string;
  due_date: string | null;
  comment_count?: number;
  attachment_count?: number;
}

interface KanbanColumnProps {
  column: Column;
  cards: Card[];
  boardId: string;
  onCardCreated: () => void;
  onCardClick: (cardId: string) => void;
  onColumnUpdated: () => void;
}

export function KanbanColumn({
  column,
  cards,
  boardId,
  onCardCreated,
  onCardClick,
  onColumnUpdated,
}: KanbanColumnProps) {
  const [showNewCard, setShowNewCard] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const menuRef = useRef<HTMLDivElement>(null);

  const { setNodeRef } = useDroppable({ id: column.id });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRename = async () => {
    const name = editName.trim();
    if (!name || name === column.name) {
      setEditing(false);
      setEditName(column.name);
      return;
    }
    try {
      await fetch(`/api/kanban/columns/${column.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      onColumnUpdated();
    } catch (err) {
      console.error("Failed to rename column:", err);
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Excluir coluna "${column.name}"? Os cards serão removidos.`)) return;
    try {
      await fetch(`/api/kanban/columns/${column.id}`, { method: "DELETE" });
      onColumnUpdated();
    } catch (err) {
      console.error("Failed to delete column:", err);
    }
  };

  const cardIds = cards.map((c) => c.id);

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: "300px",
        maxWidth: "300px",
        backgroundColor: "var(--bg)",
        borderRadius: "0.75rem",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 140px)",
        flexShrink: 0,
      }}
    >
      {/* Column Header */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "3px",
            backgroundColor: column.color,
            flexShrink: 0,
          }}
        />
        {editing ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flex: 1 }}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") { setEditing(false); setEditName(column.name); }
              }}
              autoFocus
              style={{
                flex: 1,
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-primary)",
                backgroundColor: "var(--card)",
                border: "1px solid var(--accent)",
                borderRadius: "0.25rem",
                padding: "0.125rem 0.375rem",
                outline: "none",
              }}
            />
            <button onClick={handleRename} style={{ background: "none", border: "none", color: "var(--success)", cursor: "pointer" }}>
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setEditing(false); setEditName(column.name); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <span
              style={{
                flex: 1,
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-primary)",
                fontFamily: "var(--font-heading)",
              }}
            >
              {column.name}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                backgroundColor: "var(--card)",
                padding: "0.125rem 0.375rem",
                borderRadius: "9999px",
              }}
            >
              {cards.length}
            </span>
            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "0.125rem",
                  borderRadius: "0.25rem",
                }}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    padding: "0.25rem",
                    zIndex: 20,
                    minWidth: "140px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  }}
                >
                  <button
                    onClick={() => { setShowMenu(false); setEditing(true); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      background: "none",
                      border: "none",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      fontSize: "13px",
                      borderRadius: "0.25rem",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--card-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Renomear
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); handleDelete(); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      background: "none",
                      border: "none",
                      color: "var(--error)",
                      cursor: "pointer",
                      fontSize: "13px",
                      borderRadius: "0.25rem",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--card-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Cards */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          minHeight: "80px",
        }}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={() => onCardClick(card.id)} />
          ))}
        </SortableContext>
      </div>

      {/* Add Card */}
      <div style={{ padding: "0.5rem", borderTop: "1px solid var(--border)" }}>
        {showNewCard ? (
          <NewCardForm
            columnId={column.id}
            boardId={boardId}
            onCreated={() => { setShowNewCard(false); onCardCreated(); }}
            onCancel={() => setShowNewCard(false)}
          />
        ) : (
          <button
            onClick={() => setShowNewCard(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              width: "100%",
              padding: "0.375rem 0.5rem",
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "13px",
              borderRadius: "0.375rem",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar card
          </button>
        )}
      </div>
    </div>
  );
}
