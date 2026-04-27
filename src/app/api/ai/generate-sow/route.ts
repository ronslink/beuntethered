import { NextResponse } from "next/server";
import { generateText } from "ai";
import { getCurrentUser } from "@/lib/session";
import { getDynamicAIProvider } from "@/lib/ai-router";

// Single-pass generation — 60s is plenty
export const maxDuration = 60;

// ─── Pricing guides by category (market-realistic ranges) ─────────────────
const PRICING: Record<string, { simple: string; medium: string; complex: string }> = {
  resume_writing:    { simple: "$75–$300",    medium: "$300–$800",     complex: "$800–$2,000" },
  copywriting:       { simple: "$50–$250",    medium: "$250–$1,000",   complex: "$1,000–$3,000" },
  blog_writing:      { simple: "$50–$200",    medium: "$200–$800",     complex: "$800–$2,000" },
  technical_writing: { simple: "$100–$400",   medium: "$400–$1,500",   complex: "$1,500–$4,000" },
  translation:       { simple: "$50–$200",    medium: "$200–$800",     complex: "$800–$3,000" },
  logo_design:       { simple: "$100–$400",   medium: "$400–$1,500",   complex: "$1,500–$5,000" },
  brand_identity:    { simple: "$200–$600",   medium: "$600–$2,500",   complex: "$2,500–$8,000" },
  ui_ux_design:      { simple: "$200–$600",   medium: "$600–$3,000",   complex: "$3,000–$10,000" },
  illustration:      { simple: "$50–$250",    medium: "$250–$1,000",   complex: "$1,000–$4,000" },
  web_dev_simple:    { simple: "$200–$800",   medium: "$800–$3,000",   complex: "$3,000–$8,000" },
  web_dev_complex:   { simple: "$500–$1,500", medium: "$1,500–$5,000", complex: "$5,000–$20,000" },
  mobile_app:        { simple: "$500–$2,000", medium: "$2,000–$8,000", complex: "$8,000–$30,000" },
  api_development:   { simple: "$200–$800",   medium: "$800–$3,000",   complex: "$3,000–$10,000" },
  automation:        { simple: "$100–$500",   medium: "$500–$2,000",   complex: "$2,000–$6,000" },
  seo:               { simple: "$100–$400",   medium: "$400–$1,500",   complex: "$1,500–$5,000" },
  social_media:      { simple: "$100–$400",   medium: "$400–$1,500",   complex: "$1,500–$4,000" },
  email_marketing:   { simple: "$75–$300",    medium: "$300–$1,200",   complex: "$1,200–$3,000" },
  ad_copy:           { simple: "$50–$200",    medium: "$200–$800",     complex: "$800–$2,500" },
  data_entry:        { simple: "$30–$150",    medium: "$150–$500",     complex: "$500–$1,500" },
  data_analysis:     { simple: "$100–$400",   medium: "$400–$1,500",   complex: "$1,500–$5,000" },
  video_editing:     { simple: "$100–$400",   medium: "$400–$1,500",   complex: "$1,500–$5,000" },
  animation:         { simple: "$200–$600",   medium: "$600–$2,500",   complex: "$2,500–$8,000" },
  voiceover:         { simple: "$50–$200",    medium: "$200–$600",     complex: "$600–$2,000" },
  virtual_assistant: { simple: "$50–$200",    medium: "$200–$600",     complex: "$600–$2,000" },
  project_management:{ simple: "$100–$400",   medium: "$400–$1,500",   complex: "$1,500–$5,000" },
  other_digital:     { simple: "$100–$500",   medium: "$500–$2,000",   complex: "$2,000–$8,000" },
};

// ─── Banned jargon (enforced in simple/medium tiers) ──────────────────────
const BANNED_SIMPLE = `
BANNED phrases for this tier — do NOT use any of these:
- "Executive Summary", "Verified Valuation", "Acceptance Criteria"
- "Escrow", "Architectural Blueprint", "Technical Architecture"
- "Phase 1/2/3", "Sprint", "Pipeline", "Engine"
- Any SaaS/platform terminology
- Any consulting-firm language
`;

// ─── Few-shot examples by complexity ──────────────────────────────────────
const EXAMPLES = {
  simple: `
Example 1 (resume writing):
{
  "title": "Resume Rewrite",
  "executiveSummary": "Professional rewrite of your existing resume — cleaner layout, stronger bullet points, tailored to your target role.",
  "milestones": [
    {
      "title": "Resume Rewrite & Delivery",
      "description": "Review your current resume, rewrite content with stronger action verbs and quantified achievements, format in a clean professional layout, deliver as PDF and DOCX.",
      "deliverables": ["Rewritten resume content", "Professional PDF layout", "Editable DOCX file"],
      "acceptance_criteria": "Client receives polished resume in both PDF and DOCX formats.",
      "estimated_duration_days": 3,
      "amount": 200
    }
  ],
  "totalAmount": 200
}

Example 2 (logo design):
{
  "title": "Logo Design",
  "executiveSummary": "Custom logo design with 3 initial concepts and 2 rounds of revisions.",
  "milestones": [
    {
      "title": "Logo Design & Delivery",
      "description": "Research your brand, create 3 distinct logo concepts, refine the chosen direction through 2 revision rounds, deliver final files in all standard formats.",
      "deliverables": ["3 initial concepts", "2 revision rounds", "Final files (SVG, PNG, PDF)"],
      "acceptance_criteria": "Client approves final logo and receives all file formats.",
      "estimated_duration_days": 5,
      "amount": 300
    }
  ],
  "totalAmount": 300
}`,

  medium: `
Example (multi-page website):
{
  "title": "Business Website Redesign",
  "executiveSummary": "Redesign your existing website with a modern look, mobile-friendly layout, and updated content across 5-8 pages.",
  "milestones": [
    {
      "title": "Design & Layout",
      "description": "Create wireframes and visual designs for all pages. Mobile-responsive layouts with your brand colors and typography.",
      "deliverables": ["Wireframes for all pages", "Visual mockups", "Mobile-responsive designs"],
      "acceptance_criteria": "Client approves the visual direction before development begins.",
      "estimated_duration_days": 7,
      "amount": 1200
    },
    {
      "title": "Development & Launch",
      "description": "Build the approved designs into a live website. Includes content migration, contact forms, basic SEO setup, and deployment.",
      "deliverables": ["Fully built responsive website", "Contact form integration", "Basic SEO setup", "Deployment to hosting"],
      "acceptance_criteria": "Website is live, all pages functional, forms working, mobile-friendly.",
      "estimated_duration_days": 10,
      "amount": 1800
    }
  ],
  "totalAmount": 3000
}`,

  complex: `
Example (full web application):
{
  "title": "Project Management SaaS MVP",
  "executiveSummary": "Full-stack web application with user authentication, team workspaces, task boards, and real-time notifications. Built for launch-readiness.",
  "milestones": [
    {
      "title": "Foundation & Auth",
      "description": "Set up the project infrastructure, database schema, user registration and login, team invitation system, and role-based permissions.",
      "deliverables": ["Project infrastructure setup", "User auth with email/password and OAuth", "Team invitation system", "Role-based access control"],
      "acceptance_criteria": "Users can register, log in, create teams, and invite members with assigned roles.",
      "estimated_duration_days": 14,
      "amount": 3000
    },
    {
      "title": "Core Features",
      "description": "Build the task board with drag-and-drop, project views (list/board/calendar), file attachments, and commenting system.",
      "deliverables": ["Drag-and-drop task board", "Multiple project views", "File attachment system", "Commenting and activity feed"],
      "acceptance_criteria": "Users can create, assign, and manage tasks across all view types with attachments and comments.",
      "estimated_duration_days": 14,
      "amount": 4000
    },
    {
      "title": "Polish & Launch",
      "description": "Real-time notifications, email digests, performance optimization, responsive mobile views, and production deployment.",
      "deliverables": ["Real-time notifications", "Email digest system", "Mobile-responsive UI", "Production deployment"],
      "acceptance_criteria": "Application is deployed, performant, and fully functional on mobile and desktop.",
      "estimated_duration_days": 10,
      "amount": 3000
    }
  ],
  "totalAmount": 10000
}`
};

// ─── Build the prompt for each complexity tier ────────────────────────────
function buildSowPrompt(category: string, complexity: string, prompt: string, mode: string, desiredTimeline: string) {
  const priceRange = PRICING[category] || PRICING.other_digital;
  const tierPrice = priceRange[complexity as keyof typeof priceRange] || priceRange.medium;
  const examples = EXAMPLES[complexity as keyof typeof EXAMPLES] || EXAMPLES.medium;
  
  const timelineHint = desiredTimeline 
    ? `\nThe client wants this done within: "${desiredTimeline}". Fit your timeline to this.`
    : '';

  const isDiscovery = mode === 'DISCOVERY';

  if (isDiscovery) {
    return {
      system: `You are a freelancer writing a quick project scope for a client. Write in plain, friendly English — like a real person talking to a client, not a consulting firm writing a proposal.

Return ONLY a JSON object. No markdown, no extra text.

This is a $1,000 discovery/architecture session — single milestone only.`,
      prompt: `The client wants to explore: ${prompt}

Return this exact JSON structure:
{
  "title": "Short human title (2-5 words)",
  "executiveSummary": "1-2 sentences max, plain English",
  "milestones": [
    {
      "title": "Discovery & Architecture",
      "description": "Brief description of what the discovery session covers",
      "deliverables": ["Deliverable 1", "Deliverable 2", "Deliverable 3"],
      "acceptance_criteria": "Simple pass/fail criteria",
      "estimated_duration_days": 7,
      "amount": 1000
    }
  ],
  "totalAmount": 1000
}`
    };
  }

  const milestoneRules = complexity === 'simple'
    ? `Create exactly 1 milestone. Keep the total scope under 150 words. Price should be realistic for this type of work: ${tierPrice}.
${BANNED_SIMPLE}`
    : complexity === 'medium'
    ? `Create exactly 2 milestones. Keep the total scope under 400 words. Total price should be in the range: ${tierPrice}.`
    : `Create 3-5 milestones depending on scope. Keep the total scope under 800 words. Total price should be in the range: ${tierPrice}.`;

  return {
    system: `You are a freelancer writing a project scope for a client on BeUntethered (a freelance marketplace like Upwork).

RULES:
- Write like a human freelancer talking to a client, NOT like a consulting firm proposal.
- Use plain, friendly English. No jargon, no buzzwords.
- Keep titles short and human (2-5 words).
- ${milestoneRules}
- Each milestone must have 2-4 concrete deliverables.
- Price realistically for this category (${category.replace(/_/g, ' ')}).${timelineHint}

Here are examples of the tone and structure I want:
${examples}

Return ONLY a valid JSON object matching the structure in the examples. No markdown fences, no explanation.`,
    prompt: `The client says: "${prompt}"`
  };
}

export async function POST(req: Request) {
  try {
    const { prompt, mode, desiredTimeline, category, complexity } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Please describe what you need." }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const dynamicModel = await getDynamicAIProvider(user.id);

    // Build category+complexity routed prompt
    const effectiveCategory = category || 'other_digital';
    const effectiveComplexity = complexity || 'medium';
    const sowPrompt = buildSowPrompt(effectiveCategory, effectiveComplexity, prompt, mode || 'EXECUTION', desiredTimeline || '');

    // Single-pass generation
    const { text: rawOutput } = await generateText({
      model: dynamicModel,
      system: sowPrompt.system,
      prompt: sowPrompt.prompt,
    });

    // Strip <think> reasoning traces from M2.7 output
    let cleaned = rawOutput.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // Strip markdown code fences
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
    }
    
    // Extract JSON object via brace detection
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
       cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
