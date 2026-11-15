interface AgentsListProps {
  isCreatingAgent?: boolean;
}

export function AgentsList({ isCreatingAgent = false }: AgentsListProps) {
  return (
    <div className="px-2 py-4 text-center text-description-muted">
      バックグラウンドエージェントは利用できません。
    </div>
  );
}
