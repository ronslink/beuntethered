import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Untether",
  description: "Privacy Policy for the Untether freelance marketplace platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-invert prose-sm max-w-none">
      <h1 className="text-3xl font-black font-headline tracking-tighter text-on-surface mb-2">
        Privacy Policy
      </h1>
      <p className="text-on-surface-variant text-sm mb-8">
        Last updated: April 25, 2026
      </p>

      <section className="space-y-6 text-on-surface-variant text-sm leading-relaxed [&_h2]:text-on-surface [&_h2]:font-black [&_h2]:font-headline [&_h2]:text-lg [&_h2]:tracking-tight [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-on-surface [&_h3]:font-bold [&_h3]:text-sm [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-on-surface">
        <h2>1. Information We Collect</h2>
        <h3>1.1 Account Information</h3>
        <p>
          When you register, we collect your name, email address, and password (hashed with bcrypt).
          If you sign in via GitHub or Google OAuth, we receive your public profile information from
          those providers.
        </p>
        <h3>1.2 Professional Profile</h3>
        <p>
          Facilitators provide skills, bio, portfolio URL, AI tooling stack, availability, hourly
          rate, and years of experience during onboarding. Clients provide company name, type, and
          project preferences.
        </p>
        <h3>1.3 Financial Information</h3>
        <p>
          Payment processing is handled entirely by <strong>Stripe</strong>. We store your Stripe
          Account ID and Stripe Customer ID for payment routing. We do not store credit card numbers,
          bank account details, or other sensitive financial data.
        </p>
        <h3>1.4 API Keys (BYOK)</h3>
        <p>
          Users who opt into the Bring Your Own Key feature provide API keys for third-party AI
          providers. These keys are <strong>encrypted at rest using AES-256-GCM</strong> with a
          master key stored in environment variables. Keys are only decrypted in-memory at the
          moment of API invocation.
        </p>
        <h3>1.5 Usage Data</h3>
        <p>
          We collect standard server logs including IP addresses, browser type, and pages visited
          for security and performance monitoring.
        </p>

        <h2>2. How We Use Your Information</h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Providing and operating the marketplace platform</li>
          <li>Processing payments via Stripe Connect</li>
          <li>Generating AI-assisted Statements of Work and bid scorecards (using your BYOK keys
            or platform-level API access)</li>
          <li>Vector-matching Facilitators to projects using expertise embeddings</li>
          <li>Sending transactional emails (escrow funded, milestone approved, dispute opened)</li>
          <li>Dispute resolution and AI fact-finding analysis</li>
          <li>Security monitoring and fraud prevention</li>
        </ul>

        <h2>3. Third-Party Processors</h2>
        <p>We share data with the following processors, strictly for operational purposes:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Stripe</strong> — Payment processing, escrow, and identity verification</li>
          <li><strong>Resend</strong> — Transactional email delivery</li>
          <li><strong>Vercel</strong> — Application hosting and edge rendering</li>
          <li><strong>OpenAI / Anthropic / Google</strong> — AI model inference (only when triggered
            by user actions, using the user&apos;s own API keys or platform keys)</li>
          <li><strong>Supabase / PostgreSQL</strong> — Database storage (encrypted at rest)</li>
        </ul>

        <h2>4. Data Retention</h2>
        <p>
          Account data is retained for the duration of your active account. Project data, milestone
          records, and payment references are retained for 7 years to comply with financial
          record-keeping obligations. You may request account deletion at any time (see Section 5).
        </p>

        <h2>5. Your Rights (GDPR / CCPA)</h2>
        <p>Depending on your jurisdiction, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Access</strong> — Request a copy of all personal data we hold about you</li>
          <li><strong>Rectification</strong> — Correct inaccurate personal data</li>
          <li><strong>Deletion</strong> — Request deletion of your account and personal data</li>
          <li><strong>Portability</strong> — Receive your data in a structured, machine-readable format</li>
          <li><strong>Objection</strong> — Object to processing of your data for specific purposes</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a href="mailto:privacy@untether.network" className="text-primary hover:underline">
            privacy@untether.network
          </a>.
          We will respond within 30 days.
        </p>

        <h2>6. Cookies</h2>
        <p>
          We use <strong>essential cookies only</strong> for authentication session management
          (NextAuth.js session tokens). We do not use advertising cookies, analytics cookies,
          or third-party tracking scripts. Your cookie consent preference is stored in your
          browser&apos;s local storage.
        </p>

        <h2>7. Security</h2>
        <p>
          We implement industry-standard security measures including: encrypted data at rest,
          AES-256-GCM encryption for API keys, bcrypt password hashing with 12 salt rounds,
          HTTPS-only communication, and regular security audits.
        </p>

        <h2>8. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be communicated
          via email to registered users. The &ldquo;Last updated&rdquo; date at the top of this page
          reflects the most recent revision.
        </p>

        <h2>9. Contact</h2>
        <p>
          For privacy-related inquiries, contact our Data Protection team at{" "}
          <a href="mailto:privacy@untether.network" className="text-primary hover:underline">
            privacy@untether.network
          </a>.
        </p>
      </section>
    </article>
  );
}
