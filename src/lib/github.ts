export async function fetchGitHubDiff(url: string, token?: string): Promise<{ success: boolean, diff?: string, error?: string }> {
  try {
    if (!url.includes("github.com")) {
       return { success: false, error: "Target boundary does not securely map a valid Github node." };
    }

    // Mathematically sanitize URL cleanly routing `.diff` payload structures
    let diffUrl = url.trim();
    if (!diffUrl.endsWith(".diff") && !diffUrl.endsWith(".patch")) {
        // Remove trailing slashes and append .diff
        diffUrl = `${diffUrl.replace(/\/$/, "")}.diff`;
    }

    const headers: HeadersInit = {
       "Accept": "application/vnd.github.v3.diff",
       "User-Agent": "Untether-AI-Code-Auditor"
    };

    if (token) {
       headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(diffUrl, { headers });

    if (!res.ok) {
        if (res.status === 404) {
           return { success: false, error: "Github 404 Fault: Ensure URL is correct or valid Private Access Token is structurally linked in Integrations." };
        }
        return { success: false, error: `Github fetch executed an invalid limit. Status: ${res.status}` };
    }

    const diffText = await res.text();
    return { success: true, diff: diffText };
  } catch(e: any) {
    console.error("Github Network Scraper Error:", e);
    return { success: false, error: e.message };
  }
}
