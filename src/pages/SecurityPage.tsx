import { LegalDocumentLayout, LegalSection } from '@/pages/legal/LegalDocumentLayout';

export function SecurityPage() {
  return (
    <LegalDocumentLayout
      eyebrow="Trust"
      title="Security & Data Handling"
      updated="July 28, 2026"
    >
      <LegalSection title="What this page is">
        <p>
          This is a plain-language summary of protections VensaOS already implements. It is not a
          compliance certificate, audit report, or enterprise security questionnaire answer key.
        </p>
        <p>
          We do not claim SOC 2, HIPAA, end-to-end encryption of all data, penetration-test results,
          formal uptime guarantees, or zero-knowledge storage.
        </p>
      </LegalSection>

      <LegalSection title="Owner authentication">
        <p>
          Owner workspaces require Base44 authentication. Unauthenticated visitors cannot access
          Overview, Inbox, Issues, Resolved, or Settings.
        </p>
      </LegalSection>

      <LegalSection title="Project isolation">
        <p>
          Feedback boards are project-scoped. Authorization checks revalidate ownership inside
          privileged functions so one workspace cannot read or mutate another project’s issues,
          submissions, or attachments.
        </p>
      </LegalSection>

      <LegalSection title="Private reporter tracking">
        <p>
          Reporters follow progress through private tracking links. Raw tracking tokens are not
          stored directly. VensaOS stores a one-way hash used to verify later access grants.
        </p>
      </LegalSection>

      <LegalSection title="Screenshots and attachments">
        <p>
          Screenshots use private storage references rather than permanent public URLs. Temporary
          signed URLs are issued for authorized viewing, cached only in memory on the client, and
          expire. Owner attachment access and reporter attachment access are scoped separately so
          one role cannot reuse the other role’s grant.
        </p>
      </LegalSection>

      <LegalSection title="AI processing boundaries">
        <p>
          Classification and grouping assistance may call Base44-managed AI. That path is designed
          so the model does not receive reporter email, raw tracking tokens, signed URLs, or private
          file URIs. AI suggestions are validated; when AI fails or returns invalid output,
          deterministic fallback keeps accepted submissions flowing without inventing unsupported
          conclusions.
        </p>
        <p>
          Backend validation remains authoritative. Client UI cannot grant privileges the server
          rejects.
        </p>
      </LegalSection>

      <LegalSection title="Notifications">
        <p>
          Real outbound notification delivery is currently disabled by runtime configuration.
          Product surfaces may still record notification intent or history, but VensaOS does not
          claim that email was delivered in the current demo and free-runtime posture.
        </p>
      </LegalSection>

      <LegalSection title="Reporting a security concern">
        <p>
          If you believe you found a vulnerability or unsafe data exposure in VensaOS, please report
          it through the official VensaOS project or support channel made available within the
          application. Include steps to reproduce, affected URLs or functions if known, and whether
          any personal data appears exposed. Please avoid public disclosure until we can
          investigate.
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
