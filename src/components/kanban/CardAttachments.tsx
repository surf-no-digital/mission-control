"use client";

import { useEffect, useState, useRef } from "react";
import { Paperclip, Upload, Trash2, Download, FileText } from "lucide-react";

interface Attachment {
  id: string;
  card_id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  uploaded_by: string;
  created_at: string;
}

interface CardAttachmentsProps {
  cardId: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CardAttachments({ cardId }: CardAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/kanban/cards/${cardId}/attachments`);
      const data = await res.json();
      setAttachments(data.attachments || []);
    } catch (err) {
      console.error("Failed to fetch attachments:", err);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [cardId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploaded_by", "diogo");
      await fetch(`/api/kanban/cards/${cardId}/attachments`, {
        method: "POST",
        body: formData,
      });
      fetchAttachments();
    } catch (err) {
      console.error("Failed to upload:", err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      await fetch(`/api/kanban/cards/${cardId}/attachments/${attachmentId}`, { method: "DELETE" });
      fetchAttachments();
    } catch (err) {
      console.error("Failed to delete attachment:", err);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          <Paperclip className="w-3.5 h-3.5 inline-block mr-1 mb-0.5" />
          Anexos ({attachments.length})
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.25rem 0.5rem",
            borderRadius: "0.25rem",
            backgroundColor: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: "12px",
          }}
        >
          <Upload className="w-3 h-3" />
          {uploading ? "Enviando..." : "Upload"}
        </button>
        <input ref={fileRef} type="file" onChange={handleUpload} style={{ display: "none" }} />
      </div>

      {attachments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {attachments.map((att) => (
            <div
              key={att.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.625rem",
                borderRadius: "0.375rem",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                fontSize: "13px",
              }}
            >
              <FileText className="w-4 h-4" style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {att.filename}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {formatSize(att.size)}
                </div>
              </div>
              <a
                href={`/api/kanban/cards/${cardId}/attachments/${att.id}`}
                download
                style={{ color: "var(--text-muted)", padding: "0.25rem" }}
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => handleDelete(att.id)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.25rem" }}
                title="Excluir"
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--error)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
