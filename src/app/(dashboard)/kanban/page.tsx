"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Columns3, LayoutGrid, X } from "lucide-react";

interface Board {
  id: string;
  name: string;
  description: string;
  column_count?: number;
  card_count?: number;
  created_at: string;
  updated_at: string;
}

export default function KanbanPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchBoards = async () => {
    try {
      const res = await fetch("/api/kanban/boards");
      const data = await res.json();
      setBoards(data.boards || []);
    } catch (err) {
      console.error("Failed to fetch boards:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/kanban/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setNewDesc("");
        setShowCreate(false);
        fetchBoards();
      }
    } catch (err) {
      console.error("Failed to create board:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/kanban/boards/${id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      fetchBoards();
    } catch (err) {
      console.error("Failed to delete board:", err);
    }
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold mb-1"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
              letterSpacing: "-1.5px",
            }}
          >
            <Columns3 className="inline-block w-7 h-7 mr-2 mb-1" />
            Kanban Boards
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Gerencie seus projetos com quadros Kanban
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            backgroundColor: "var(--accent)",
            color: "var(--text-primary)",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
          }}
        >
          <Plus className="w-4 h-4" />
          Novo Board
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
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
          onClick={() => setShowCreate(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "28rem",
              margin: "1rem",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--text-primary)",
                  fontSize: "1.125rem",
                  fontWeight: 600,
                }}
              >
                Novo Board
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <input
                type="text"
                placeholder="Nome do board"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              <textarea
                placeholder="Descrição (opcional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "var(--accent)",
                  color: "var(--text-primary)",
                  border: "none",
                  cursor: creating || !newName.trim() ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "14px",
                  opacity: creating || !newName.trim() ? 0.5 : 1,
                }}
              >
                {creating ? "Criando..." : "Criar Board"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Boards Grid */}
      {loading ? (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem" }}>
          Carregando boards...
        </div>
      ) : boards.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "var(--text-muted)",
          }}
        >
          <LayoutGrid className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.3 }} />
          <p style={{ fontSize: "16px", marginBottom: "0.5rem" }}>Nenhum board encontrado</p>
          <p style={{ fontSize: "14px" }}>Crie seu primeiro board para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <div
              key={board.id}
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                padding: "1.25rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative",
              }}
              onClick={() => router.push(`/kanban/${board.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <h3
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--text-primary)",
                    fontSize: "1rem",
                    fontWeight: 600,
                  }}
                >
                  {board.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(board.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: "0.25rem",
                    borderRadius: "0.25rem",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--error)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {board.description && (
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "13px",
                    marginBottom: "0.75rem",
                    lineHeight: 1.4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {board.description}
                </p>
              )}
              <div className="flex items-center gap-3" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                <span>{board.column_count ?? 0} colunas</span>
                <span>•</span>
                <span>{board.card_count ?? 0} cards</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
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
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "24rem",
              margin: "1rem",
              textAlign: "center",
            }}
          >
            <p style={{ color: "var(--text-primary)", marginBottom: "1rem", fontSize: "14px" }}>
              Tem certeza que deseja excluir este board? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "var(--card-elevated)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "var(--error)",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
