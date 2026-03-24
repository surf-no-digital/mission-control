"use client";

import { useEffect, useState, useCallback } from "react";
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
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BoardHeader } from "./BoardHeader";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { NewColumnForm } from "./NewColumnForm";
import { CardModal } from "./CardModal";
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

interface BoardViewProps {
  boardId: string;
}

export function BoardView({ boardId }: BoardViewProps) {
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [showNewColumn, setShowNewColumn] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/kanban/boards/${boardId}`);
      if (!res.ok) return;
      const data = await res.json();
      setBoard(data.board);
      setColumns(data.columns || []);
      setCards(data.cards || []);
    } catch (err) {
      console.error("Failed to fetch board:", err);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const getColumnCards = (columnId: string) =>
    cards
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

    // Check if over a column directly
    const overColumn = columns.find((col) => col.id === overId);
    if (overColumn && activeCardObj.column_id !== overColumn.id) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === activeCardId ? { ...c, column_id: overColumn.id } : c
        )
      );
      return;
    }

    // Check if over another card
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

    // Determine target column
    let targetColumnId = card.column_id;
    const overColumn = columns.find((col) => col.id === over.id);
    const overCard = cards.find((c) => c.id === over.id);

    if (overColumn) {
      targetColumnId = overColumn.id;
    } else if (overCard) {
      targetColumnId = overCard.column_id;
    }

    // Calculate position
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

    // Optimistic update
    setCards((prev) =>
      prev.map((c) =>
        c.id === activeCardId ? { ...c, column_id: targetColumnId, position } : c
      )
    );

    // API call
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

  const handleCardCreated = () => {
    fetchBoard();
  };

  const handleColumnCreated = () => {
    setShowNewColumn(false);
    fetchBoard();
  };

  const handleBoardUpdate = (updated: Partial<Board>) => {
    if (board) setBoard({ ...board, ...updated });
  };

  if (loading) {
    return (
      <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem" }}>
        Carregando board...
      </div>
    );
  }

  if (!board) {
    return (
      <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem" }}>
        Board não encontrado
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <BoardHeader board={board} onUpdate={handleBoardUpdate} />

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
              />
            ))}

          <DragOverlay>
            {activeCard ? (
              <KanbanCard card={activeCard} onClick={() => {}} isDragOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Add column button */}
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
          onClose={() => {
            setSelectedCardId(null);
            fetchBoard();
          }}
        />
      )}
    </div>
  );
}
