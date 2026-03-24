import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface SquadConfig {
  id: string;
  name: string;
  emoji: string;
  color: string;
  leadAgentId: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  emoji: string;
  role: string;
  squad: string | null;
  reportsTo: string | null;
  model: string;
  openclawAgentId: string | null;
  status: 'online' | 'offline' | 'busy' | 'planned';
  color: string;
}

interface AgentsConfigFile {
  squads: SquadConfig[];
  agents: AgentConfig[];
}

const CONFIG_PATH = join(process.cwd(), 'data', 'agents-config.json');

let cachedConfig: AgentsConfigFile | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30 seconds

export function getAgentsConfig(): AgentsConfigFile {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) {
    return cachedConfig;
  }

  if (!existsSync(CONFIG_PATH)) {
    return { squads: [], agents: [] };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    cachedConfig = JSON.parse(raw) as AgentsConfigFile;
    cacheTimestamp = now;
    return cachedConfig;
  } catch {
    return { squads: [], agents: [] };
  }
}

export function getSquads(): SquadConfig[] {
  return getAgentsConfig().squads;
}

export function getAgentsList(): AgentConfig[] {
  return getAgentsConfig().agents;
}

export function getAgentById(id: string): AgentConfig | undefined {
  return getAgentsConfig().agents.find(a => a.id === id);
}

export function getAgentsBySquad(squadId: string): AgentConfig[] {
  return getAgentsConfig().agents.filter(a => a.squad === squadId);
}

export function getOrgTree(): {
  orchestrator: AgentConfig | undefined;
  squads: Array<SquadConfig & { agents: AgentConfig[] }>;
} {
  const config = getAgentsConfig();
  const orchestrator = config.agents.find(a => a.squad === null && a.reportsTo === null);

  const squads = config.squads.map(squad => ({
    ...squad,
    agents: config.agents.filter(a => a.squad === squad.id),
  }));

  return { orchestrator, squads };
}
