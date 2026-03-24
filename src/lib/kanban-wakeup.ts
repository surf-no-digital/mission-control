interface WakeupCard {
  id: string;
  title: string;
  description: string;
  priority: string;
}

export function wakeupAgent(agentId: string, card: WakeupCard, fromColumn: string, toColumn: string): boolean {
  try {
    const message = JSON.stringify({
      type: 'kanban_card_assigned',
      card_id: card.id,
      title: card.title,
      description: card.description,
      priority: card.priority,
      from_column: fromColumn,
      to_column: toColumn,
      message: `Card "${card.title}" foi movido para ${toColumn}. Por favor, comece a trabalhar nesta tarefa.`
    });

    // Try to use OpenClaw CLI to send message to agent
    // This is a best-effort attempt - if it fails, we log but don't block
    console.log(`[kanban-wakeup] Waking agent ${agentId} for card ${card.id}`);
    console.log(`[kanban-wakeup] Message: ${message}`);

    // TODO: Integrate with OpenClaw sessions_send when agent is active
    // For now, log the wakeup attempt
    return true;
  } catch (error) {
    console.error(`[kanban-wakeup] Failed to wake agent ${agentId}:`, error);
    return false;
  }
}
