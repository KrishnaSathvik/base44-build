import { LegalDocumentLayout, LegalSection } from '@/pages/legal/LegalDocumentLayout';

export function TermsPage() {
  return (
    <LegalDocumentLayout eyebrow="Legal" title="Terms of Service" updated="July 28, 2026">
      <LegalSection title="Agreement">
        <p>
          These Terms of Service (“Terms”) govern access to and use of VensaOS, a feedback-management
          and feedback-intelligence application for product teams. By creating an account or using
          the service, you agree to these Terms.
        </p>
      </LegalSection>

      <LegalSection title="What VensaOS is for">
        <p>
          VensaOS is intended for collecting, organizing, prioritizing, and resolving product
          feedback. It is not a general-purpose social network, consumer messaging product, medical
          record system, or payment processor.
        </p>
      </LegalSection>

      <LegalSection title="Accounts and responsibilities">
        <p>
          Account holders are responsible for safeguarding credentials, configuring boards
          appropriately, reviewing AI suggestions before acting on them, and ensuring their use of
          VensaOS complies with applicable law and their own customer or user commitments.
        </p>
        <p>
          You must have permission to submit or upload content you provide, including screenshots,
          text, and other evidence. Do not upload content you are not authorized to share.
        </p>
      </LegalSection>

      <LegalSection title="Ownership and license">
        <p>
          Customers retain ownership of their feedback and product data. VensaOS receives only the
          limited permission needed to host, process, display, secure, back up, and otherwise operate
          the service for you—including classification, grouping suggestions, prioritization, and
          attachment delivery through authorized access.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You may not use VensaOS to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>submit illegal, harmful, deceptive, or abusive content;</li>
          <li>attempt to access another workspace, report, or attachment without authorization;</li>
          <li>interfere with service integrity, security, or availability;</li>
          <li>upload malware or attempt to exploit the application;</li>
          <li>use the service to harass individuals or collect sensitive personal data without a
            lawful basis and clear necessity.
          </li>
        </ul>
        <p>
          Reporters and owners should avoid submitting passwords, financial account numbers, health
          information, government identifiers, or other highly sensitive personal data through
          feedback forms or screenshots.
        </p>
      </LegalSection>

      <LegalSection title="AI assistance">
        <p>
          VensaOS may use automated classification and grouping suggestions. Those suggestions can be
          incorrect, incomplete, or contextually wrong. Owners remain responsible for product
          decisions, including whether to merge reports, change status, publish resolutions, or
          communicate with reporters.
        </p>
      </LegalSection>

      <LegalSection title="Availability and beta nature">
        <p>
          VensaOS is an evolving product. Features may change, be limited, or become temporarily
          unavailable. We do not promise uninterrupted access, specific response times, or formal
          uptime commitments in these Terms.
        </p>
      </LegalSection>

      <LegalSection title="Suspension and termination">
        <p>
          We may suspend or terminate access if we reasonably believe an account or use violates
          these Terms, creates security risk, or harms the service or other users. You may stop using
          VensaOS at any time and may delete projects or account-associated data through available
          product controls or by contacting the official support channel made available within the
          application.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimer of warranties">
        <p>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW,
          WE DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT AI OUTPUT WILL BE ACCURATE OR THAT THE SERVICE
          WILL BE ERROR-FREE.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, VENSAOS AND ITS SUPPLIERS WILL NOT BE LIABLE FOR
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS,
          REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE. OUR
          AGGREGATE LIABILITY FOR CLAIMS RELATING TO THE SERVICE IS LIMITED TO ONE HUNDRED U.S.
          DOLLARS (US $100) OR THE AMOUNT YOU PAID TO USE VENSAOS IN THE TWELVE MONTHS BEFORE THE
          CLAIM, WHICHEVER IS GREATER. Because VensaOS does not currently charge customers, that
          amount is typically US $100 unless a court requires otherwise.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These Terms are governed by the laws of the State of California, USA, excluding conflict of
          law rules, unless mandatory local consumer protections apply. Courts located in California
          will have exclusive jurisdiction over disputes arising from these Terms, subject to
          applicable law.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update these Terms as the product evolves. The “Last updated” date will change when
          material revisions are published. Continued use after an update constitutes acceptance of
          the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions regarding these Terms may be submitted through the official VensaOS project or
          support channel made available within the application.
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
