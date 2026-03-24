"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare, Paperclip, Calendar } from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#6b7280",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

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

interface KanbanCardProps {
  card: Card;
  onClick: () => void;
  isDragOverlay?: boolean;
}

export function KanbanCard({ card, onClick, isDragOverlay }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const labels = card.labels ? JSON.parse(card.labels) : [];
  const priorityColor = PRIORITY_COLORS[card.priority] || PRIORITY_COLORS.low;

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={{
        ...(!isDragOverlay ? style : {}),
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "0.5rem",
        padding: "0.75rem",
        cursor: "pointer",
        boxShadow: isDragOverlay ? "0 8px 24px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.1)",
        transition: isDragOverlay ? undefined : "box-shadow 0.2s, border-color 0.2s",
      }}
      onClick={onClick}
      {...(!isDragOverlay ? { ...attributes, ...listeners } : {})}
      onMouseEnter={(e) => {
        if (!isDragOverlay) e.currentTarget.style.borderColor = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        if (!isDragOverlay) e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Labels */}
      {labels.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "0.5rem" }}>
          {labels.map((label: string, i: number) => (
            <span
              key={i}
              style={{
                fontSize: "10px",
                padding: "0.125rem 0.375rem",
                borderRadius: "9999px",
                backgroundColor: "var(--accent)",
                color: "var(--text-primary)",
                fontWeight: 500,
                opacity: 0.8,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <div
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: "0.5rem",
          lineHeight: 1.4,
        }}
      >
        {card.title}
      </div>

      {/* Bottom row: priority, assignee, counts */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Priority */}
          {card.priority && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "0.125rem 0.375rem",
                borderRadius: "0.25rem",
                backgroundColor: `${priorityColor}20`,
                color: priorityColor,
                textTransform: "uppercase",
              }}
            >
              {PRIORITY_LABELS[card.priority] || card.priority}
            </span>
          )}

          {/* Due date */}
          {card.due_date && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              <Calendar className="w-3 h-3" />
              {new Date(card.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Comment count */}
          {(card.comment_count ?? 0) > 0 && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.125rem",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              <MessageSquare className="w-3 h-3" />
              {card.comment_count}
            </span>
          )}

          {/* Attachment count */}
          {(card.attachment_count ?? 0) > 0 && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.125rem",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              <Paperclip className="w-3 h-3" />
              {card.attachment_count}
            </span>
          )}

          {/* Assignee emoji placeholder */}
          {card.assignee_agent_id && (
            <span
              style={{
                fontSize: "14px",
                lineHeight: 1,
              }}
              title={card.assignee_agent_id}
            >
              👤
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
