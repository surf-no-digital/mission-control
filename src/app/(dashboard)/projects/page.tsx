"use client";

import { useEffect, useState } from "react";
import {
  GitBranch,
  Download,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  Loader2,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  github_repo: string;
  github_default_branch: string;
  language: string;
  last_push_at: string | null;
  issue_count_open: number;
  issue_count_closed: number;
  created_at: string;
}

interface GitHubRepo {
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  default_branch: string;
  html_url: string;
  pushed_at: string;
  open_issues_count: number;
  private: boolean;
  archived: boolean;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/projects/github-repos");
      const data = await res.json();
      setRepos(data.repos || []);
    } catch (err) {
      console.error("Failed to fetch repos:", err);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleOpenImport = () => {
    setShowImport(true);
    fetchRepos();
  };

  const toggleRepo = (fullName: string) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) next.delete(fullName);
      else next.add(fullName);
      return next;
    });
  };

  const handleImport = async () => {
    if (selectedRepos.size === 0) return;
    setImporting(true);
    try {
      const selectedData = repos.filter((r) => selectedRepos.has(r.full_name));
      await fetch("/api/projects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos: selectedData }),
      });
      setShowImport(false);
      setSelectedRepos(new Set());
      fetchProjects();
    } catch (err) {
      console.error("Failed to import:", err);
    } finally {
      setImporting(false);
    }
  };

  const handleSync = async (projectId: string) => {
    setSyncing(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}/sync`, { method: "POST" });
      const data = await res.json();
      alert(`Sincronizado! ${data.created} cards criados, ${data.skipped} já existentes.`);
      fetchProjects();
    } catch (err) {
      console.error("Failed to sync:", err);
    } finally {
      setSyncing(null);
    }
  };

  const importedRepoNames = new Set(projects.map((p) => p.github_repo));
  const availableRepos = repos.filter(
    (r) => !r.archived && !importedRepoNames.has(r.full_name)
  );

  const LANG_COLORS: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f7df1e",
    Python: "#3572A5",
    Rust: "#dea584",
    Go: "#00ADD8",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Shell: "#89e051",
  };

  return (
    <div className="p-4 md:p-8">
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
            <GitBranch className="inline-block w-7 h-7 mr-2 mb-1" />
            Projetos
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Repos importados do GitHub — sincronize issues pro Kanban
          </p>
        </div>
        <button
          onClick={handleOpenImport}
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
          <Download className="w-4 h-4" />
          Import from GitHub
        </button>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem" }}>
          Carregando projetos...
        </div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-muted)" }}>
          <GitBranch className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.3 }} />
          <p style={{ fontSize: "16px", marginBottom: "0.5rem" }}>Nenhum projeto importado</p>
          <p style={{ fontSize: "14px" }}>Importe repos do GitHub para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                padding: "1.25rem",
                transition: "all 0.2s ease",
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
                  {project.name}
                </h3>
                <a
                  href={`https://github.com/${project.github_repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--text-muted)", padding: "0.25rem" }}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              {project.description && (
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
                  {project.description}
                </p>
              )}
              <div
                className="flex items-center gap-3 mb-3"
                style={{ fontSize: "12px", color: "var(--text-muted)" }}
              >
                {project.language && (
                  <span className="flex items-center gap-1">
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: LANG_COLORS[project.language] || "#6b7280",
                        display: "inline-block",
                      }}
                    />
                    {project.language}
                  </span>
                )}
                <span>{project.issue_count_open} issues abertas</span>
              </div>
              <button
                onClick={() => handleSync(project.id)}
                disabled={syncing === project.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.375rem 0.75rem",
                  borderRadius: "0.375rem",
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  cursor: syncing === project.id ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  opacity: syncing === project.id ? 0.6 : 1,
                }}
              >
                {syncing === project.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Sync Issues → Kanban
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
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
          onClick={() => setShowImport(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "36rem",
              margin: "1rem",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
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
                Import from GitHub
              </h2>
              <button
                onClick={() => setShowImport(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingRepos ? (
              <div
                style={{
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "2rem",
                }}
              >
                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                Carregando repos...
              </div>
            ) : availableRepos.length === 0 ? (
              <div
                style={{
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "2rem",
                  fontSize: "14px",
                }}
              >
                Todos os repos já foram importados!
              </div>
            ) : (
              <>
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  {availableRepos.map((repo) => {
                    const selected = selectedRepos.has(repo.full_name);
                    return (
                      <div
                        key={repo.full_name}
                        onClick={() => toggleRepo(repo.full_name)}
                        style={{
                          padding: "0.75rem",
                          borderRadius: "0.5rem",
                          backgroundColor: selected
                            ? "var(--accent)"
                            : "var(--bg)",
                          border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "4px",
                            border: `2px solid ${selected ? "var(--text-primary)" : "var(--border)"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {selected && (
                            <Check
                              className="w-3 h-3"
                              style={{ color: "var(--text-primary)" }}
                            />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {repo.name}
                            {repo.private && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  marginLeft: "0.5rem",
                                  padding: "0.125rem 0.375rem",
                                  borderRadius: "9999px",
                                  backgroundColor: "var(--card-elevated)",
                                  color: "var(--text-muted)",
                                }}
                              >
                                private
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "var(--text-muted)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {repo.description}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--text-muted)",
                              marginTop: "0.25rem",
                              display: "flex",
                              gap: "0.75rem",
                            }}
                          >
                            {repo.language && (
                              <span className="flex items-center gap-1">
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor:
                                      LANG_COLORS[repo.language] || "#6b7280",
                                    display: "inline-block",
                                  }}
                                />
                                {repo.language}
                              </span>
                            )}
                            <span>
                              {repo.open_issues_count} issues
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={handleImport}
                  disabled={importing || selectedRepos.size === 0}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    backgroundColor: "var(--accent)",
                    color: "var(--text-primary)",
                    border: "none",
                    cursor:
                      importing || selectedRepos.size === 0
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: 600,
                    fontSize: "14px",
                    opacity:
                      importing || selectedRepos.size === 0 ? 0.5 : 1,
                    width: "100%",
                  }}
                >
                  {importing
                    ? "Importando..."
                    : `Importar ${selectedRepos.size} repo${selectedRepos.size !== 1 ? "s" : ""}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
