"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Trash2, Calendar, Tag, User, Flag, Clock } from "lucide-react";
import { CardComments } from "./CardComments";
import { CardAttachments } from "./CardAttachments";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#6b7280",
};

const PRIORITIES = ["urgent", "high", "medium", "low"] as const;

interface Column {
  id: string;
  name: string;
  color: string;
}

interface CardDetail {
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
  created_by: string;
  created_at: string;
  updated_at: string;
  comment_count: number;
  attachment_count: number;
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role: string;
}

interface Activity {
  id: string;
  card_id: string;
  actor_id: string;
  action: string;
  details: string;
  created_at: string;
}

interface CardModalProps {
  cardId: string;
  columns: Column[];
  onClose: () => void;
}

export function CardModal({ cardId, columns, onClose }: CardModalProps) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchCard = useCallback(async () => {
    try {
      const [cardRes, agentsRes, activityRes] = await Promise.all([
        fetch(`/api/kanban/cards/${cardId}`),
        fetch("/api/agents"),
        fetch(`/api/kanban/cards/${cardId}/activity`),
      ]);
      const cardData = await cardRes.json();
      const agentsData = await agentsRes.json();
      const activityData = await activityRes.json();

      if (cardData.card) {
        setCard(cardData.card);
        setTitleValue(cardData.card.title);
        setDescValue(cardData.card.description || "");
      }
      setAgents(agentsData.agents || []);
      setActivity(activityData.activity || []);
    } catch (err) {
      console.error("Failed to fetch card:", err);
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const updateField = async (fields: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/kanban/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        const updated = await res.json();
        setCard((prev) => (prev ? { ...prev, ...updated } : prev));
      }
    } catch (err) {
      console.error("Failed to update card:", err);
    }
  };

  const handleSaveTitle = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== card?.title) {
      updateField({ title: trimmed });
    }
    setEditingTitle(false);
  };

  const handleSaveDesc = () => {
    if (descValue !== card?.description) {
      updateField({ description: descValue });
    }
    setEditingDesc(false);
  };

  const handleDeleteCard = async () => {
    try {
      await fetch(`/api/kanban/cards/${cardId}`, { method: "DELETE" });
      onClose();
    } catch (err) {
      console.error("Failed to delete card:", err);
    }
  };

  const labels: string[] = card?.labels ? JSON.parse(card.labels) : [];

  const addLabel = () => {
    const l = labelInput.trim();
    if (!l || labels.includes(l)) return;
    const newLabels = [...labels, l];
    setLabelInput("");
    updateField({ labels: JSON.stringify(newLabels) });
    setCard((prev) => prev ? { ...prev, labels: JSON.stringify(newLabels) } : prev);
  };

  const removeLabel = (label: string) => {
    const newLabels = labels.filter((l) => l !== label);
    updateField({ labels: JSON.stringify(newLabels) });
    setCard((prev) => prev ? { ...prev, labels: JSON.stringify(newLabels) } : prev);
  };

  const currentColumn = columns.find((c) => c.id === card?.column_id);
  const assignedAgent = agents.find((a) => a.id === card?.assignee_agent_id);

  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "var(--text-muted)" }}>Carregando...</div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "2rem 1rem",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          width: "100%",
          maxWidth: "56rem",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div style={{ flex: 1 }}>
            {editingTitle ? (
              <input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") { setEditingTitle(false); setTitleValue(card.title); }
                }}
                autoFocus
                style={{
                  width: "100%",
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
            ) : (
              <h2
                onClick={() => setEditingTitle(true)}
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-heading)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  letterSpacing: "-0.5px",
                }}
                title="Clique para editar"
              >
                {card.title}
              </h2>
            )}
            {currentColumn && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.375rem" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "2px",
                    backgroundColor: currentColumn.color,
                  }}
                />
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  em {currentColumn.name}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.25rem" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            display: "flex",
            flex: 1,
            overflow: "hidden",
          }}
        >
          {/* Left - main content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            {/* Description */}
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
                Descrição
              </h3>
              {editingDesc ? (
                <textarea
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  onBlur={handleSaveDesc}
                  autoFocus
                  rows={6}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.375rem",
                    backgroundColor: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                    lineHeight: 1.5,
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <div
                  onClick={() => setEditingDesc(true)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.375rem",
                    backgroundColor: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: card.description ? "var(--text-primary)" : "var(--text-muted)",
                    fontSize: "14px",
                    minHeight: "80px",
                    cursor: "pointer",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {card.description || "Clique para adicionar descrição..."}
                </div>
              )}
            </div>

            {/* Attachments */}
            <CardAttachments cardId={cardId} />

            {/* Comments */}
            <CardComments cardId={cardId} />

            {/* Activity */}
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
                <Clock className="w-3.5 h-3.5 inline-block mr-1 mb-0.5" />
                Atividade
              </h3>
              {activity.length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Nenhuma atividade registrada</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {activity.map((a) => {
                    let details = "";
                    try {
                      const d = JSON.parse(a.details);
                      if (d && typeof d === "object") {
                        details = Object.entries(d)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ");
                      }
                    } catch {
                      details = a.details || "";
                    }
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          padding: "0.375rem 0",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{a.actor_id}</span>
                        <span>{a.action}</span>
                        {details && <span style={{ opacity: 0.7 }}>({details})</span>}
                        <span style={{ marginLeft: "auto", flexShrink: 0 }}>
                          {new Date(a.created_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div
            style={{
              width: "240px",
              borderLeft: "1px solid var(--border)",
              padding: "1.25rem",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              flexShrink: 0,
            }}
          >
            {/* Assignee */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "0.375rem" }}>
                <User className="w-3 h-3 inline-block mr-1 mb-0.5" />
                Responsável
              </label>
              <select
                value={card.assignee_agent_id || ""}
                onChange={(e) => {
                  const val = e.target.value || null;
                  updateField({ assignee_agent_id: val });
                  setCard((prev) => prev ? { ...prev, assignee_agent_id: val } : prev);
                }}
                style={{
                  width: "100%",
                  padding: "0.375rem 0.5rem",
                  borderRadius: "0.375rem",
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                }}
              >
                <option value="">Nenhum</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.emoji} {agent.name}
                  </option>
                ))}
              </select>
              {assignedAgent && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.375rem", fontSize: "13px", color: "var(--text-primary)" }}>
                  <span>{assignedAgent.emoji}</span>
                  <span>{assignedAgent.name}</span>
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "0.375rem" }}>
                <Flag className="w-3 h-3 inline-block mr-1 mb-0.5" />
                Prioridade
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      updateField({ priority: p });
                      setCard((prev) => prev ? { ...prev, priority: p } : prev);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.375rem 0.5rem",
                      borderRadius: "0.375rem",
                      backgroundColor: card.priority === p ? `${PRIORITY_COLORS[p]}20` : "transparent",
                      border: card.priority === p ? `1px solid ${PRIORITY_COLORS[p]}` : "1px solid transparent",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      fontSize: "12px",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: PRIORITY_COLORS[p],
                      }}
                    />
                    {p === "urgent" ? "Urgente" : p === "high" ? "Alta" : p === "medium" ? "Média" : "Baixa"}
                  </button>
                ))}
              </div>
            </div>

            {/* Labels */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "0.375rem" }}>
                <Tag className="w-3 h-3 inline-block mr-1 mb-0.5" />
                Labels
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "0.375rem" }}>
                {labels.map((l) => (
                  <span
                    key={l}
                    style={{
                      fontSize: "11px",
                      padding: "0.125rem 0.375rem",
                      borderRadius: "9999px",
                      backgroundColor: "var(--accent)",
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    {l}
                    <button
                      onClick={() => removeLabel(l)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: "11px",
                        lineHeight: 1,
                        opacity: 0.7,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Adicionar label..."
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addLabel();
                }}
                style={{
                  width: "100%",
                  padding: "0.375rem 0.5rem",
                  borderRadius: "0.375rem",
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Due date */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "0.375rem" }}>
                <Calendar className="w-3 h-3 inline-block mr-1 mb-0.5" />
                Data limite
              </label>
              <input
                type="date"
                value={card.due_date ? card.due_date.split("T")[0].split(" ")[0] : ""}
                onChange={(e) => {
                  const val = e.target.value || null;
                  updateField({ due_date: val });
                  setCard((prev) => prev ? { ...prev, due_date: val } : prev);
                }}
                style={{
                  width: "100%",
                  padding: "0.375rem 0.5rem",
                  borderRadius: "0.375rem",
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Delete */}
            <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              {deleteConfirm ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  <p style={{ fontSize: "12px", color: "var(--error)", marginBottom: "0.25rem" }}>
                    Confirmar exclusão?
                  </p>
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    <button
                      onClick={handleDeleteCard}
                      style={{
                        flex: 1,
                        padding: "0.375rem",
                        borderRadius: "0.375rem",
                        backgroundColor: "var(--error)",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      Excluir
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      style={{
                        flex: 1,
                        padding: "0.375rem",
                        borderRadius: "0.375rem",
                        backgroundColor: "transparent",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.375rem",
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "0.375rem",
                    backgroundColor: "transparent",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    fontSize: "12px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--error)";
                    e.currentTarget.style.color = "var(--error)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir Card
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
