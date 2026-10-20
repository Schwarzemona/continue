interface AgentsListProps {
  isCreatingAgent?: boolean;
}

export function AgentsList({ isCreatingAgent = false }: AgentsListProps) {
  return (
    <div className="text-description-muted px-2 py-4 text-center">
      Background agents are not available.
    </div>
  );
}
