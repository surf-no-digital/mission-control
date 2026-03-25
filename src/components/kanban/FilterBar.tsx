"use client";

import { useState } from "react";
import { Search, X, Filter } from "lucide-react";

interface Label {
  id: string;
  name: string;
  color: string;
  type: string;
}

interface FilterBarProps {
  labels: Label[];
  selectedLabels: string[];
  searchQuery: string;
  selectedPriority: string;
  onLabelToggle: (labelId: string) => void;
  onSearchChange: (query: string) => void;
  onPriorityChange: (priority: string) => void;
  onClearAll: () => void;
}

const PRIORITIES = [
  { value: "", label: "Todas" },
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

export function FilterBar({
  labels,
  selectedLabels,
  searchQuery,
  selectedPriority,
  onLabelToggle,
  onSearchChange,
  onPriorityChange,
  onClearAll,
}: FilterBarProps) {
  const [showLabels, setShowLabels] = useState(false);
  const hasFilters = selectedLabels.length > 0 || searchQuery || selectedPriority;

  const areaLabels = labels.filter((l) => l.type === "area");
  const projectLabels = labels.filter((l) => l.type === "project");
  const customLabels = labels.filter((l) => l.type === "custom");

  return (
    <div
      style={{
        padding: "0.5rem 1rem",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--card)",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        flexWrap: "wrap",
        flexShrink: 0,
      }}
    >
      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          padding: "0.375rem 0.625rem",
          borderRadius: "0.375rem",
          backgroundColor: "var(--bg)",
          border: "1px solid var(--border)",
          minWidth: "180px",
        }}
      >
        <Search className="w-3.5 h-3.5" style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Buscar cards..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: "13px",
            width: "100%",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Label filter toggle */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowLabels(!showLabels)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.375rem 0.625rem",
            borderRadius: "0.375rem",
            backgroundColor: selectedLabels.length > 0 ? "var(--accent)" : "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          <Filter className="w-3.5 h-3.5" />
          Labels
          {selectedLabels.length > 0 && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                backgroundColor: "var(--text-primary)",
                color: "var(--card)",
                borderRadius: "9999px",
                padding: "0 0.375rem",
                minWidth: "16px",
                textAlign: "center",
              }}
            >
              {selectedLabels.length}
            </span>
          )}
        </button>

        {showLabels && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 30 }}
              onClick={() => setShowLabels(false)}
            />
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "0.25rem",
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                padding: "0.5rem",
                zIndex: 40,
                minWidth: "200px",
                maxHeight: "300px",
                overflowY: "auto",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              {areaLabels.length > 0 && (
                <>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", padding: "0.25rem 0.375rem", letterSpacing: "0.5px" }}>
                    Áreas
                  </div>
                  {areaLabels.map((label) => (
                    <LabelOption
                      key={label.id}
                      label={label}
                      selected={selectedLabels.includes(label.id)}
                      onToggle={() => onLabelToggle(label.id)}
                    />
                  ))}
                </>
              )}
              {projectLabels.length > 0 && (
                <>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", padding: "0.25rem 0.375rem", marginTop: "0.375rem", letterSpacing: "0.5px" }}>
                    Projetos
                  </div>
                  {projectLabels.map((label) => (
                    <LabelOption
                      key={label.id}
                      label={label}
                      selected={selectedLabels.includes(label.id)}
                      onToggle={() => onLabelToggle(label.id)}
                    />
                  ))}
                </>
              )}
              {customLabels.length > 0 && (
                <>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", padding: "0.25rem 0.375rem", marginTop: "0.375rem", letterSpacing: "0.5px" }}>
                    Custom
                  </div>
                  {customLabels.map((label) => (
                    <LabelOption
                      key={label.id}
                      label={label}
                      selected={selectedLabels.includes(label.id)}
                      onToggle={() => onLabelToggle(label.id)}
                    />
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Priority filter */}
      <select
        value={selectedPriority}
        onChange={(e) => onPriorityChange(e.target.value)}
        style={{
          padding: "0.375rem 0.625rem",
          borderRadius: "0.375rem",
          backgroundColor: selectedPriority ? "var(--accent)" : "var(--bg)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          fontSize: "13px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.value ? `Prioridade: ${p.label}` : "Prioridade"}
          </option>
        ))}
      </select>

      {/* Selected label badges */}
      {selectedLabels.map((labelId) => {
        const label = labels.find((l) => l.id === labelId);
        if (!label) return null;
        return (
          <span
            key={labelId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "11px",
              padding: "0.125rem 0.5rem",
              borderRadius: "9999px",
              backgroundColor: `${label.color}30`,
              color: label.color,
              border: `1px solid ${label.color}50`,
              fontWeight: 500,
            }}
          >
            {label.name}
            <button
              onClick={() => onLabelToggle(labelId)}
              style={{ background: "none", border: "none", color: label.color, cursor: "pointer", padding: 0, fontSize: "13px", lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        );
      })}

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={onClearAll}
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

function LabelOption({
  label,
  selected,
  onToggle,
}: {
  label: { id: string; name: string; color: string };
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        width: "100%",
        padding: "0.375rem",
        borderRadius: "0.25rem",
        backgroundColor: selected ? `${label.color}20` : "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        color: "var(--text-primary)",
        fontSize: "13px",
      }}
    >
      <span
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "3px",
          backgroundColor: label.color,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1 }}>{label.name}</span>
      {selected && <span style={{ color: label.color, fontWeight: 700 }}>✓</span>}
    </button>
  );
}
