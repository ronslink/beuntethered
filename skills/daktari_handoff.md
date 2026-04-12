# Skill: Hetzner Daktari Bot Handoff
    
**Purpose:** Use this skill to physically hand off or assign complex logic tasks to the internal Daktari Orchestrator Bot residing on the Hetzner server.

**Execution Parameters:**
To invoke the orchestrator natively:
1. **Pre-Handoff Sync [CRITICAL]:** Before assigning any work, natively run `git add .`, `git commit`, and `git push` in the local workspace to ensure the remote tracking branch is perfectly synchronized with current application context.
2. Initialize an interactive SSH session to the node:
   \`\`\`powershell
   ssh root@157.180.84.79
   \`\`\`
3. Once connected, open the orchestrator terminal user interface:
   \`\`\`bash
   openclaw tui
   \`\`\`
4. Select the orchestrator prompt and instruct it strictly to use **kimi code** algorithms.
5. Pass your specific architectural task criteria into the TUI prompt exactly as formatted by the user.
6. **Task Protocol:** You MUST explicitly instruct the Daktari Bot to execute a `git pull` before it runs any generative algorithms, and command it to explicitly execute a `git push` after finalizing its compilation.
**Caution:**
As outlined in `AGENTS.md`, once the Daktari bot completes the task, securely verify its payload schema and typed endpoints before natively committing the code array.
