import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

interface WakeupCard {
  id: string;
  title: string;
  description: string;
  priority: string;
  assignee_agent_id: string;
}

interface AgentConfig {
  id: string;
  openclawAgentId: string | null;
  name: string;
}

function getOpenClawAgentId(agentId: string): string | null {
  try {
    const configPath = join(process.cwd(), 'data', 'agents-config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const agent = config.agents?.find((a: AgentConfig) => a.id === agentId);
    return agent?.openclawAgentId || null;
  } catch {
    return null;
  }
}

export function wakeupAgent(
  agentId: string,
  card: WakeupCard,
  fromColumn: string,
  toColumn: string
): { success: boolean; method: string; error?: string } {
  const openclawAgentId = getOpenClawAgentId(agentId);

  if (!openclawAgentId) {
    console.log(`[kanban-wakeup] Agent "${agentId}" is planned (no OpenClaw agent). Skipping wakeup.`);
    return { success: false, method: 'skipped', error: 'Agent not yet active in OpenClaw' };
  }

  const message = [
    `📋 *Tarefa movida para ${toColumn}*`,
    ``,
    `*${card.title}*`,
    card.description ? `${card.description.substring(0, 200)}` : '',
    ``,
    `Prioridade: ${card.priority}`,
    `De: ${fromColumn} → ${toColumn}`,
    `Card ID: ${card.id}`,
    ``,
    `Por favor, comece a trabalhar nesta tarefa.`,
  ].filter(Boolean).join('\n');

  try {
    const sessionKey = `agent:${openclawAgentId}:main`;
    execSync(
      `openclaw sessions send --key "${sessionKey}" --message ${JSON.stringify(message)}`,
      { timeout: 10000, stdio: 'pipe' }
    );
    console.log(`[kanban-wakeup] ✅ Woke agent "${agentId}" (${openclawAgentId}) for card "${card.title}"`);
    return { success: true, method: 'openclaw-cli' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[kanban-wakeup] ❌ Failed to wake agent "${agentId}":`, errorMsg);
    
    // Fallback: try writing to a wakeup file that the agent can check
    try {
      const wakeupDir = join(process.cwd(), 'data', 'wakeups');
      const { mkdirSync, writeFileSync } = require('fs');
      mkdirSync(wakeupDir, { recursive: true });
      writeFileSync(
        join(wakeupDir, `${agentId}-${Date.now()}.json`),
        JSON.stringify({ agentId, card, fromColumn, toColumn, timestamp: new Date().toISOString() }, null, 2)
      );
      console.log(`[kanban-wakeup] 📁 Wrote wakeup file for agent "${agentId}"`);
      return { success: true, method: 'wakeup-file' };
    } catch {
      return { success: false, method: 'failed', error: errorMsg };
    }
  }
}
