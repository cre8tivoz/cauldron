type Props = {
  site: CauldronSite | null;
};

/** Layout place for the agent. It is wired to the agent tools in 3.2. */
export function AgentPanel({ site }: Props) {
  return (
    <>
      <div className="pane-header">Agent</div>
      <div className="pane-body">
        {site ? (
          <p className="hint">The agent connection is not built yet.</p>
        ) : (
          <p className="hint">Open a site to work on it.</p>
        )}
      </div>
    </>
  );
}
