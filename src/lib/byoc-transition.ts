export type BYOCTransitionBaseline = {
  transitionMode: string;
  currentState: string | null;
  priorWork: string | null;
  remainingWork: string | null;
  knownRisks: string | null;
};

export function readSowLine(sow: string | null | undefined, label: string) {
  if (!sow) return null;

  const normalizedLabel = `${label.toLowerCase()}:`;
  const line = sow
    .split("\n")
    .find((entry) => entry.trim().toLowerCase().startsWith(normalizedLabel));

  return line ? line.trim().slice(label.length + 1).trim() || null : null;
}

export function getBYOCTransitionBaseline(sow: string | null | undefined): BYOCTransitionBaseline | null {
  const transitionMode = readSowLine(sow, "Transition mode");
  const currentState = readSowLine(sow, "Current project state");
  const priorWork = readSowLine(sow, "Prior work or existing assets");
  const remainingWork = readSowLine(sow, "Remaining work to govern in Untether");
  const knownRisks = readSowLine(sow, "Known risks or open questions");

  if (!transitionMode && !currentState && !priorWork && !remainingWork && !knownRisks) {
    return null;
  }

  return {
    transitionMode: transitionMode || "new external project",
    currentState,
    priorWork,
    remainingWork,
    knownRisks,
  };
}
