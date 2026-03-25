"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { BoardHeader } from "./BoardHeader";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { NewColumnForm } from "./NewColumnForm";
import { CardModal } from "./CardModal";
import { FilterBar } from "./FilterBar";
import { Plus } from "lucide-react";

interface Board {
  id: string;
  name: string;
  description: string;
}

interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  color: string;
  wakeup_on_enter: number;
}

interface Label {
  id: string;
  name: string;
  color: string;
  type: string;
  board_id: string;
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
  github_repo: string | null;
  github_issue_number: number | null;
  comment_count?: number;
  attachment_count?: number;
}

interface BoardViewProps {
  boardId: string;
}

export function BoardView({ boardId }: BoardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [cardLabelsMap, setCardLabelsMap] = useState<Record<string, Label[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [showNewColumn, setShowNewColumn] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showGitHubCloseDialog, setShowGitHubCloseDialog] = useState<{
    cardId: string;
    repo: string;
    issue: number;
    columnId: string;
    position: number;
  } | null>(null);

  // Filters from URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    searchParams.get("labels")?.split(",").filter(Boolean) || []
  );
  const [selectedPriority, setSelectedPriority] = useState(
    searchParams.get("priority") || ""
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedLabels.length > 0) params.set("labels", selectedLabels.join(","));
    if (selectedPriority) params.set("priority", selectedPriority);
    const qs = params.toString();
    const newUrl = qs ? `?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [searchQuery, selectedLabels, selectedPriority]);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/kanban/boards/${boardId}`);
      if (!res.ok) return;
      const data = await res.json();
      setBoard(data.board);
      setColumns(data.columns || []);
      setCards(data.cards || []);
      setAllLabels(data.labels || []);

      // Build card labels map
      const map: Record<string, Label[]> = {};
      if (data.cardLabelsMap) {
        for (const entry of data.cardLabelsMap) {
          map[entry.card_id] = entry.labels;
        }
      }
      setCardLabelsMap(map);
    } catch (err) {
      console.error("Failed to fetch board:", err);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    let result = cards;

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
    }

    // Priority filter
    if (selectedPriority) {
      result = result.filter((c) => c.priority === selectedPriority);
    }

    // Label filter
    if (selectedLabels.length > 0) {
      result = result.filter((c) => {
        const cLabels = cardLabelsMap[c.id] || [];
        return selectedLabels.some((lid) => cLabels.some((l) => l.id === lid));
      });
    }

    return result;
  }, [cards, searchQuery, selectedPriority, selectedLabels, cardLabelsMap]);

  const getColumnCards = (columnId: string) =>
    filteredCards
      .filter((c) => c.column_id === columnId)
      .sort((a, b) => a.position - b.position);

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id);
    if (card) setActiveCard(card);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;

    const activeCardObj = cards.find((c) => c.id === activeCardId);
    if (!activeCardObj) return;

    const overColumn = columns.find((col) => col.id === overId);
    if (overColumn && activeCardObj.column_id !== overColumn.id) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === activeCardId ? { ...c, column_id: overColumn.id } : c
        )
      );
      return;
    }

    const overCard = cards.find((c) => c.id === overId);
    if (overCard && activeCardObj.column_id !== overCard.column_id) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === activeCardId ? { ...c, column_id: overCard.column_id } : c
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeCardId = active.id as string;
    const card = cards.find((c) => c.id === activeCardId);
    if (!card) return;

    let targetColumnId = card.column_id;
    const overColumn = columns.find((col) => col.id === over.id);
    const overCard = cards.find((c) => c.id === over.id);

    if (overColumn) {
      targetColumnId = overColumn.id;
    } else if (overCard) {
      targetColumnId = overCard.column_id;
    }

    const columnCards = cards
      .filter((c) => c.column_id === targetColumnId && c.id !== activeCardId)
      .sort((a, b) => a.position - b.position);

    let position = 0;
    if (overCard && overCard.column_id === targetColumnId) {
      const overIndex = columnCards.findIndex((c) => c.id === overCard.id);
      position = overIndex >= 0 ? overIndex : columnCards.length;
    } else {
      position = columnCards.length;
    }

    // Check if moving to Done column and card has GitHub issue
    const targetColumn = columns.find((c) => c.id === targetColumnId);
    if (
      targetColumn?.name === "Done" &&
      card.github_repo &&
      card.github_issue_number
    ) {
      setShowGitHubCloseDialog({
        cardId: activeCardId,
        repo: card.github_repo,
        issue: card.github_issue_number,
        columnId: targetColumnId,
        position,
      });
    }

    // Optimistic update
    setCards((prev) =>
      prev.map((c) =>
        c.id === activeCardId
          ? { ...c, column_id: targetColumnId, position }
          : c
      )
    );

    try {
      await fetch(`/api/kanban/cards/${activeCardId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column_id: targetColumnId, position }),
      });
      fetchBoard();
    } catch (err) {
      console.error("Failed to move card:", err);
      fetchBoard();
    }
  };

  const handleCloseGitHubIssue = async () => {
    if (!showGitHubCloseDialog) return;
    try {
      await fetch(
        `/api/kanban/cards/${showGitHubCloseDialog.cardId}/github-close`,
        { method: "POST" }
      );
    } catch (err) {
      console.error("Failed to close GitHub issue:", err);
    }
    setShowGitHubCloseDialog(null);
  };

  const handleCardCreated = () => fetchBoard();
  const handleColumnCreated = () => {
    setShowNewColumn(false);
    fetchBoard();
  };
  const handleBoardUpdate = (updated: Partial<Board>) => {
    if (board) setBoard({ ...board, ...updated });
  };

  const handleLabelToggle = (labelId: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((l) => l !== labelId)
        : [...prev, labelId]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedLabels([]);
    setSelectedPriority("");
  };

  if (loading) {
    return (
      <div
        style={{
          color: "var(--text-muted)",
          textAlign: "center",
          padding: "3rem",
        }}
      >
        Carregando board...
      </div>
    );
  }

  if (!board) {
    return (
      <div
        style={{
          color: "var(--text-muted)",
          textAlign: "center",
          padding: "3rem",
        }}
      >
        Board não encontrado
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <BoardHeader board={board} onUpdate={handleBoardUpdate} />

      <FilterBar
        labels={allLabels}
        selectedLabels={selectedLabels}
        searchQuery={searchQuery}
        selectedPriority={selectedPriority}
        onLabelToggle={handleLabelToggle}
        onSearchChange={setSearchQuery}
        onPriorityChange={setSelectedPriority}
        onClearAll={handleClearFilters}
      />

      <div
        style={{
          flex: 1,
          overflowX: "auto",
          overflowY: "hidden",
          padding: "1rem",
          display: "flex",
          gap: "1rem",
          alignItems: "flex-start",
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {columns
            .sort((a, b) => a.position - b.position)
            .map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={getColumnCards(column.id)}
                boardId={boardId}
                onCardCreated={handleCardCreated}
                onCardClick={setSelectedCardId}
                onColumnUpdated={fetchBoard}
                cardLabelsMap={cardLabelsMap}
              />
            ))}

          <DragOverlay>
            {activeCard ? (
              <KanbanCard
                card={activeCard}
                onClick={() => {}}
                isDragOverlay
                cardLabels={cardLabelsMap[activeCard.id] || []}
              />
            ) : null}
          </DragOverlay>
        </DndContext>

        {showNewColumn ? (
          <NewColumnForm
            boardId={boardId}
            onCreated={handleColumnCreated}
            onCancel={() => setShowNewColumn(false)}
          />
        ) : (
          <button
            onClick={() => setShowNewColumn(true)}
            style={{
              minWidth: "280px",
              padding: "0.75rem",
              borderRadius: "0.75rem",
              backgroundColor: "var(--card)",
              border: "1px dashed var(--border)",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              fontSize: "14px",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <Plus className="w-4 h-4" />
            Adicionar Coluna
          </button>
        )}
      </div>

      {/* Card Modal */}
      {selectedCardId && (
        <CardModal
          cardId={selectedCardId}
          columns={columns}
          boardId={boardId}
          allLabels={allLabels}
          onClose={() => {
            setSelectedCardId(null);
            fetchBoard();
          }}
        />
      )}

      {/* GitHub Close Issue Dialog */}
      {showGitHubCloseDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowGitHubCloseDialog(null)}
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
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: "var(--text-primary)",
                marginBottom: "0.5rem",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              Fechar issue no GitHub?
            </p>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: "1rem",
                fontSize: "13px",
              }}
            >
              Este card está vinculado a{" "}
              <a
                href={`https://github.com/${showGitHubCloseDialog.repo}/issues/${showGitHubCloseDialog.issue}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)" }}
              >
                {showGitHubCloseDialog.repo}#
                {showGitHubCloseDialog.issue}
              </a>
              . Deseja fechar a issue?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowGitHubCloseDialog(null)}
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
                Não, só mover
              </button>
              <button
                onClick={handleCloseGitHubIssue}
                style={{
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
                Sim, fechar issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
