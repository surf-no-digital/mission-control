"use client";

import { useState, useEffect } from "react";

interface Integration {
  id: string;
  name: string;
  icon: string;
  status: string;
  metrics: any;
  lastSync: string | null;
  error?: string;
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Nunca";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora mesmo";
  if (mins < 60) return `Há ${mins} minuto${mins > 1 ? "s" : ""}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Há ${hours} hora${hours > 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  return `Há ${days} dia${days > 1 ? "s" : ""}`;
}

function MetricBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: "8px",
        backgroundColor: "var(--bg)",
        minWidth: "80px",
      }}
    >
      <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
        {value}
      </span>
      <span style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const [expanded, setExpanded] = useState(false);
  const isConnected = integration.status === "connected";
  const m = integration.metrics || {};

  return (
    <div
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "20px",
        cursor: "pointer",
        transition: "all 150ms ease",
      }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px" }}>{integration.icon}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
              {integration.name}
            </h3>
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: 500,
            backgroundColor: isConnected ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: isConnected ? "var(--success)" : "var(--error)",
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "currentColor" }} />
          {isConnected ? "Conectado" : "Desconectado"}
        </span>
      </div>

      {/* Metrics */}
      {integration.id === "github" && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          <MetricBadge label="Repositórios" value={m.repos ?? 0} />
          <MetricBadge label="PRs Abertos" value={m.openPRs ?? 0} />
        </div>
      )}
      {integration.id === "vercel" && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          <MetricBadge label="Projetos" value={m.totalProjects ?? 0} />
          <MetricBadge label="Deploys Recentes" value={m.recentDeployments?.length ?? 0} />
        </div>
      )}
      {integration.id === "sanity" && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          <MetricBadge label="Posts Publicados" value={m.published ?? 0} />
          <MetricBadge label="Rascunhos" value={m.drafts ?? 0} />
          <MetricBadge label="Total" value={m.totalPosts ?? 0} />
        </div>
      )}
      {integration.id === "cloudflare" && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          <MetricBadge label="Zona" value={m.zone || "—"} />
          <MetricBadge label="Registros DNS" value={m.dnsRecords ?? 0} />
          <MetricBadge label="Status" value={m.status || "—"} />
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid var(--border)",
            fontSize: "13px",
            color: "var(--text-secondary)",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {integration.id === "github" && m.recentRepos?.length > 0 && (
            <div>
              <strong style={{ color: "var(--text-primary)" }}>Repositórios Recentes</strong>
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
                {m.recentRepos.map((r: any) => (
                  <li key={r.name} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {r.name}
                    </a>
                    {r.language && (
                      <span style={{ marginLeft: "8px", fontSize: "11px", opacity: 0.7 }}>{r.language}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {integration.id === "vercel" && m.recentDeployments?.length > 0 && (
            <div>
              <strong style={{ color: "var(--text-primary)" }}>Deploys Recentes</strong>
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
                {m.recentDeployments.map((d: any, i: number) => (
                  <li key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {d.name}
                    </a>
                    <span style={{ marginLeft: "8px", fontSize: "11px", opacity: 0.7 }}>
                      {d.state}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {integration.id === "sanity" && m.recentPosts?.length > 0 && (
            <div>
              <strong style={{ color: "var(--text-primary)" }}>Posts Recentes</strong>
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
                {m.recentPosts.map((p: any, i: number) => (
                  <li key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      {p.title || "Sem título"}
                    </span>
                    {p.slug && (
                      <span style={{ marginLeft: "8px", fontSize: "11px", opacity: 0.7 }}>/{p.slug}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {integration.id === "cloudflare" && m.records?.length > 0 && (
            <div>
              <strong style={{ color: "var(--text-primary)" }}>Registros DNS</strong>
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
                {m.records.map((r: any, i: number) => (
                  <li
                    key={i}
                    style={{
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: "var(--accent-soft, rgba(59,130,246,0.1))",
                        color: "var(--accent)",
                      }}
                    >
                      {r.type}
                    </span>
                    <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{r.name}</span>
                    <span style={{ fontSize: "11px", opacity: 0.7 }}>{r.content}</span>
                    {r.proxied && <span style={{ fontSize: "10px", color: "var(--warning)" }}>🛡️</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {integration.error && (
            <p style={{ color: "var(--error)" }}>Erro: {integration.error}</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: "12px", fontSize: "11px", color: "var(--text-secondary)", opacity: 0.7 }}>
        Última sincronização: {timeAgo(integration.lastSync)}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "20px",
        height: "180px",
      }}
    >
      <div
        style={{
          width: "60%",
          height: "20px",
          borderRadius: "4px",
          backgroundColor: "var(--border)",
          marginBottom: "12px",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          width: "40%",
          height: "14px",
          borderRadius: "4px",
          backgroundColor: "var(--border)",
          marginBottom: "20px",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div style={{ display: "flex", gap: "8px" }}>
        {[1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "80px",
              height: "50px",
              borderRadius: "8px",
              backgroundColor: "var(--border)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/integrations")
      .then((res) => res.json())
      .then((data) => {
        setIntegrations(data.integrations || []);
        setLoading(false);
      })
      .catch((err) => {
        setError("Falha ao carregar integrações");
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: "24px", maxWidth: "1200px" }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>
          🔌 Integrações
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>
          Status dos serviços conectados ao Command Center
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "var(--error)",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "16px",
        }}
      >
        {loading
          ? [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
          : integrations.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
      </div>
    </div>
  );
}
