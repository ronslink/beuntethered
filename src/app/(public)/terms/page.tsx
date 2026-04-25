import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Untether",
  description: "Terms of Service for the Untether freelance marketplace platform.",
};

export default function TermsOfServicePage() {
  return (
    <article className="prose prose-invert prose-sm max-w-none">
      <h1 className="text-3xl font-black font-headline tracking-tighter text-on-surface mb-2">
        Terms of Service
      </h1>
      <p className="text-on-surface-variant text-sm mb-8">
        Last updated: April 25, 2026 &middot; Version 1.0
      </p>

      <section className="space-y-6 text-on-surface-variant text-sm leading-relaxed [&_h2]:text-on-surface [&_h2]:font-black [&_h2]:font-headline [&_h2]:text-lg [&_h2]:tracking-tight [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-on-surface [&_h3]:font-bold [&_h3]:text-sm [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-on-surface">
        <h2>1. Platform Overview</h2>
        <p>
          Untether (&ldquo;the Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a freelance
          marketplace that connects Clients with independent Facilitators (developers, architects,
          and technical experts) for software project delivery. The Platform provides AI-assisted
          project scoping, milestone-based Stripe Escrow payment processing, and dispute resolution
          tools.
        </p>

        <h2>2. User Roles &amp; Eligibility</h2>
        <p>
          Users register as either a <strong>Client</strong> (project poster) or a{" "}
          <strong>Facilitator</strong> (independent contractor). You must be at least 18 years of
          age and legally able to enter binding contracts in your jurisdiction.
        </p>

        <h2>3. Independent Contractor Relationship</h2>
        <p>
          <strong>Facilitators are independent contractors, not employees of Untether or the
          Client.</strong> The Platform does not control how, when, or where Facilitators perform
          their work. Facilitators are solely responsible for their own tax obligations, insurance,
          and compliance with local labor laws. Nothing in these Terms creates an employment,
          partnership, joint venture, or agency relationship.
        </p>

        <h2>4. Fees &amp; Orchestration Premium</h2>
        <h3>4.1 Facilitator Fees</h3>
        <p>
          Untether charges <strong>0% platform fees</strong> to Facilitators. Facilitators retain
          100% of the milestone amount upon escrow release, minus standard Stripe payment processing
          fees (approximately 2.9% + 30&cent;).
        </p>
        <h3>4.2 Client Orchestration Premium</h3>
        <p>
          Clients pay an <strong>8% Orchestration &amp; Escrow Premium</strong> on each milestone
          funded through the Platform. This fee covers AI-generated scoping, Stripe Escrow
          infrastructure, and dispute resolution services. For projects brought via the BYOC
          (Bring Your Own Client) program, the premium is reduced to 5%. Discovery milestone
          engagements carry a 25% platform fee reflecting the AI-assisted deliverable generation.
        </p>

        <h2>5. Escrow &amp; Payment Terms</h2>
        <p>
          All milestone payments are processed through Stripe Connect. Funds are held in escrow
          until the Client approves the milestone deliverables. Upon approval, funds are
          automatically transferred to the Facilitator&apos;s connected Stripe account.
        </p>
        <h3>5.1 Refund Policy</h3>
        <p>
          If a dispute is resolved in the Client&apos;s favor, escrowed funds for the disputed
          milestone will be refunded to the Client via Stripe. Refunds are processed within 5-10
          business days.
        </p>
        <h3>5.2 Escrow Release</h3>
        <p>
          Facilitators submit milestone deliverables (including code payloads and live preview URLs).
          Clients must review and approve or dispute within 14 calendar days of submission.
          If no action is taken within 14 days, the milestone is automatically approved and funds
          are released.
        </p>

        <h2>6. Dispute Resolution</h2>
        <p>
          Either party may open a dispute on an active milestone. Disputes freeze the project and
          trigger an AI-assisted fact-finding analysis. A human arbiter reviews the AI report and
          evidence from both parties before rendering a binding decision. The arbiter may resolve
          the dispute in favor of either party, resulting in escrow release or refund.
        </p>

        <h2>7. AI-Generated Content Disclaimer</h2>
        <p>
          The Platform uses artificial intelligence to generate Statements of Work, bid scorecards,
          squad match recommendations, and dispute fact-finding reports. <strong>AI-generated content
          is provided as a draft and advisory tool only.</strong> It does not constitute legal advice,
          a binding contract, or a guaranteed outcome. Users are responsible for reviewing, editing,
          and approving all AI-generated content before it becomes part of any agreement.
        </p>

        <h2>8. Intellectual Property</h2>
        <p>
          Upon escrow release for a milestone, all intellectual property rights in the delivered code
          and assets transfer from the Facilitator to the Client, unless explicitly agreed otherwise
          in the Statement of Work. Until escrow release, the Facilitator retains full ownership of
          their work product.
        </p>

        <h2>9. BYOK (Bring Your Own Key) Data Handling</h2>
        <p>
          Users may provide their own API keys for AI providers (OpenAI, Anthropic, Google). These
          keys are <strong>encrypted at rest using AES-256-GCM</strong> and are only transmitted to
          the user&apos;s chosen AI provider for explicitly triggered features. Untether does not
          use customer API keys for any purpose other than executing the specific feature the user
          requested.
        </p>

        <h2>10. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Untether shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising out of or related to the
          use of the Platform, including but not limited to loss of profits, data, or business
          opportunities. Our total liability for any claim shall not exceed the total fees paid by
          the user to Untether in the 12 months preceding the claim.
        </p>

        <h2>11. Modifications</h2>
        <p>
          We may update these Terms from time to time. Material changes will be communicated via
          email to registered users at least 30 days before they take effect. Continued use of the
          Platform after changes take effect constitutes acceptance of the revised Terms.
        </p>

        <h2>12. Contact</h2>
        <p>
          For questions about these Terms, contact us at{" "}
          <a href="mailto:legal@untether.network" className="text-primary hover:underline">
            legal@untether.network
          </a>.
        </p>
      </section>
    </article>
  );
}
