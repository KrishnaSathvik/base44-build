import { Link } from 'react-router-dom';
import { LegalDocumentLayout, LegalSection } from '@/pages/legal/LegalDocumentLayout';

export function PrivacyPage() {
  return (
    <LegalDocumentLayout eyebrow="Legal" title="Privacy Policy" updated="July 28, 2026">
      <LegalSection title="Overview">
        <p>
          VensaOS (“we”, “us”) is a feedback-intelligence product for product teams. This policy
          explains what information is collected, why it is used, how long it is retained, who may
          receive it, and when automated processing is involved.
        </p>
        <p>
          We do not sell personal information. We do not use personal information for advertising or
          cross-context behavioral advertising.
        </p>
      </LegalSection>

      <LegalSection title="Information we collect">
        <p>
          <strong className="font-medium text-ink">Account information.</strong> Workspace owners
          create accounts through Base44 authentication. VensaOS currently supports email and
          password registration and sign-in. If Google authentication is enabled for the linked
          Base44 application, Google may process account credentials under Google’s and Base44’s
          terms. Account data typically includes email address and authentication metadata needed to
          secure the workspace.
        </p>
        <p>
          <strong className="font-medium text-ink">Public feedback text.</strong> Reporters may submit
          descriptions, expected behavior, feedback type, and related product context through a
          public feedback board.
        </p>
        <p>
          <strong className="font-medium text-ink">Optional reporter email.</strong> If a board is
          configured to collect email, reporters may optionally provide an address for status
          updates. Email is not required to submit feedback and is not used for marketing.
        </p>
        <p>
          <strong className="font-medium text-ink">Screenshots and follow-up attachments.</strong>{' '}
          Reporters and authorized participants may upload images that become private evidence
          attached to a report or conversation.
        </p>
        <p>
          <strong className="font-medium text-ink">Device and page context.</strong> When included,
          submissions may capture browser name/version, operating system or device type, screen and
          viewport size, and an optional page URL. VensaOS does not use this context for
          advertising, IP geolocation profiling, or cross-site fingerprinting.
        </p>
        <p>
          <strong className="font-medium text-ink">Private tracking links.</strong> After submission,
          reporters may receive a private tracking link. The raw tracking token is not stored
          directly; a one-way hash is retained so the link can authorize later access.
        </p>
        <p>
          <strong className="font-medium text-ink">Owner workspace activity.</strong> Authenticated
          owners generate operational records such as issue status changes, public messages, internal
          notes, grouping decisions, and notification history inside their projects.
        </p>
        <p>
          <strong className="font-medium text-ink">Essential application storage.</strong> VensaOS uses
          essential authentication, security, and application-storage technologies (for example
          session cookies or local drafts). It does not currently use analytics, advertising, or
          other nonessential tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="How we use information">
        <p>We use collected information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>operate public feedback boards and private tracking pages;</li>
          <li>authenticate owners and enforce project isolation;</li>
          <li>classify, group, prioritize, and display feedback for product teams;</li>
          <li>store private evidence and issue conversation history;</li>
          <li>provide optional status updates when a reporter opts in;</li>
          <li>maintain security, integrity, debugging, and abuse prevention;</li>
          <li>comply with legal obligations where applicable.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Automated processing and AI">
        <p>
          Feedback text and related non-sensitive context may be processed by Base44-managed AI
          services (including InvokeLLM) to help classify reports and suggest grouping. AI output is
          validated and may fall back to deterministic processing when the model is unavailable or
          returns invalid results.
        </p>
        <p>
          AI supports the owner; it does not independently make final product decisions. Owners
          remain responsible for merges, status changes, resolutions, and customer-facing
          explanations.
        </p>
        <p>
          AI processing is configured so that reporter email addresses, raw tracking tokens, signed
          attachment URLs, and private file URIs are not sent to the model.
        </p>
      </LegalSection>

      <LegalSection title="Who receives information">
        <p>
          Information is shared only as needed to operate the service. Primary service providers
          include:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-ink">Base44</strong> — application backend, data
            storage, authentication, hosted functions, and AI tooling;
          </li>
          <li>
            <strong className="font-medium text-ink">Vercel</strong> — frontend hosting and delivery of
            the VensaOS web application.
          </li>
        </ul>
        <p>
          Workspace owners can see feedback submitted to their boards. Reporters with a valid private
          tracking link can see their own report, authorized attachments, and public updates.
          Providers process data under their own terms and security controls as subprocessors of the
          service.
        </p>
      </LegalSection>

      <LegalSection title="Retention and deletion">
        <p>
          Account, project, issue, attachment, and tracking records are retained while needed to
          operate the workspace and close the feedback loop. Owners may delete projects or related
          records through the product where that capability is available. Deletion requests and
          privacy questions may be submitted through the official VensaOS project or support channel
          made available within the application.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We apply practical safeguards such as authenticated owner access, project-level
          authorization, hashed tracking grants, private attachment storage, short-lived signed URLs
          for file access, and server-side validation. No method of transmission or storage is
          perfectly secure. See the{' '}
          <Link to="/security" className="text-ink underline underline-offset-2">
            Security &amp; Data Handling
          </Link>{' '}
          page for a plain-language summary of current controls.
        </p>
      </LegalSection>

      <LegalSection title="International processing">
        <p>
          VensaOS and its service providers may process information in the United States and other
          countries where infrastructure is located. If you use the service from another region, your
          information may be transferred to and processed outside your country.
        </p>
      </LegalSection>

      <LegalSection title="Your privacy rights">
        <p>
          Depending on where you live, you may have rights to access, correct, delete, or obtain
          information about certain personal data, or to object to or restrict certain processing.
          California residents may also have rights under the CCPA/CPRA, including the right to know
          categories of personal information collected and to request deletion, subject to
          exceptions. Because we do not sell personal information or use it for advertising, we do
          not offer an “opt out of sale” control for advertising sale.
        </p>
        <p>
          To exercise a privacy request, use the official VensaOS project or support channel made
          available within the application and describe the request clearly so we can verify and
          respond.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          VensaOS is intended for product teams and adult users of those products. It is not directed
          to children, and we do not knowingly collect personal information from children.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update this policy as the product evolves. The “Last updated” date above will
          change when material revisions are published. Continued use after an update means you
          acknowledge the revised policy.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions regarding this policy may be submitted through the official VensaOS project or
          support channel made available within the application.
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
