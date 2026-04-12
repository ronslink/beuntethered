"use server";

import { prisma } from "@/lib/auth";

export async function fetchRecommendedSquad(executiveSummary: string) {
  try {
    // Deterministic Mock Logic for Vector Math MVP 
    // Securely bounds the string execution dynamically into a hash
    let hash = 0;
    for (let i = 0; i < executiveSummary.length; i++) {
        const char = executiveSummary.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    // Pull 3 active Elite Facilitators randomly to represent matched vectors functionally
    const facilitators = await prisma.user.findMany({
       where: { role: 'FACILITATOR' },
       take: 3,
       select: {
          id: true,
          name: true,
          email: true,
          image: true,
          trust_score: true,
          total_sprints_completed: true,
          average_ai_audit_score: true
       }
    });

    // We manually map our deterministic pseudo-vector bounds right here
    // Match limits dynamically shift safely preserving stable staging tests
    const mappedSquad = facilitators.map((f, index) => {
       const mockOffset = index === 0 ? 11 : index === 1 ? 10 : 9;
       const mockBase = index === 0 ? 88 : index === 1 ? 85 : 80;
       return {
          ...f,
          match_score: mockBase + (Math.abs(hash) % mockOffset)
       }
    });

    return { success: true, matchData: mappedSquad.sort((a,b) => b.match_score - a.match_score) };
  } catch (err: any) {
    console.error("Squad Matching Error:", err);
    return { success: false, error: err.message };
  }
}
