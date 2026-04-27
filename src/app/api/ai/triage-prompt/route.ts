import { NextResponse } from "next/server";
import { generateText } from "ai";
import { getCurrentUser } from "@/lib/session";
import { getHighspeedProvider } from "@/lib/ai-router";

// Fast triage — highspeed model, sub-second target
export const maxDuration = 15;

// Hardcoded blocklist for obvious abuse (checked before any LLM call)
const BLOCKED_PATTERNS = [
  /\b(kill|murder|bomb|weapon|drug|cocaine|heroin|meth)\b/i,
  /\b(hack\s+into|steal\s+data|phishing|ransomware)\b/i,
  /\b(child\s+porn|csam|underage)\b/i,
];

// Platform scope definition
const PLATFORM_SCOPE = `BeUntethered is a freelance marketplace for REMOTE DIGITAL SERVICES only.

SUPPORTED categories (deliverable remotely by a freelancer):
- Writing & content: resume writing, copywriting, blog posts, technical writing, translation
- Design: logo design, brand identity, UI/UX design, illustration, presentation design
- Software: web development, mobile apps, APIs, database design, automation scripts
- Marketing: SEO, social media management, email campaigns, ad copy, analytics
- Data: data entry, data analysis, spreadsheets, research
- Audio/Video: video editing, animation, voiceover, podcast editing, music production
- Admin: virtual assistant, project management, customer support setup

NOT SUPPORTED (return in_scope: false):
- Physical goods (cars, furniture, hardware, manufacturing, construction)
- In-person services (plumbing, moving, cleaning, tutoring in-person)
- Licensed professional services (legal advice, medical diagnosis, financial advisory)
- Illegal or harmful activities of any kind`;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return NextResponse.json({ 
        in_scope: false, 
        reason: "Please describe what you need — even a sentence or two is enough." 
      }, { status: 400 });
    }

    // Layer 1: Instant blocklist check (zero latency)
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(prompt)) {
        return NextResponse.json({ 
          in_scope: false, 
          reason: "This request contains content that isn't allowed on BeUntethered." 
        }, { status: 400 });
      }
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    // Layer 2: LLM triage using M2.7-highspeed (sub-second, cached)
    const highspeed = getHighspeedProvider();

    const { text: rawTriage } = await generateText({
      model: highspeed,
      system: `You are a request classifier for a freelance marketplace. Classify the user's request.

${PLATFORM_SCOPE}

Return ONLY a JSON object with this exact structure:
{
  "in_scope": true or false,
  "category": "one of: resume_writing, copywriting, blog_writing, technical_writing, translation, logo_design, brand_identity, ui_ux_design, illustration, web_dev_simple, web_dev_complex, mobile_app, api_development, automation, seo, social_media, email_marketing, ad_copy, data_entry, data_analysis, video_editing, animation, voiceover, virtual_assistant, project_management, other_digital",
  "complexity": "simple or medium or complex",
  "summary": "A short 3-8 word human description of what they need",
  "reason": "Only if in_scope is false — a friendly 1-sentence explanation"
}

Complexity guide:
- simple: under ~8 hours work (resume rewrite, logo, short blog post, simple landing page)
- medium: 8-40 hours (multi-page website, brand package, series of articles, app feature)
- complex: 40+ hours (full web app, mobile app, large platform, ongoing retainer)

Return ONLY the JSON. No markdown, no explanation.`,
      prompt: prompt,
    });

    // Parse triage response
    let cleaned = rawTriage.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
    }
    
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    const triage = JSON.parse(cleaned);
    return NextResponse.json(triage);

  } catch (error: any) {
    console.error("Triage Error:", error);
    // Fail open — let them proceed with defaults rather than blocking
    return NextResponse.json({ 
      in_scope: true, 
      category: "other_digital", 
      complexity: "medium", 
      summary: "Project scope" 
    });
  }
}
