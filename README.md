# VensaOS

Feedback intelligence for product teams.

VensaOS turns scattered user feedback into grouped, evidence-backed issues a product team can prioritize, resolve, and close with reporters. It is a React PWA backed by the existing Base44 application and its stable entities, functions, and API contracts.

## Local development

```bash
npm install
npm run dev
```

Use `.env.example` as the configuration reference. Do not enable notification delivery for local tests.

## Verification

```bash
npm run brand:check
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run release:check
```

The release check forces `NOTIFICATION_INTEGRATION_ENABLED=false`, so test runs do not send real email. Deployment and hosted verification are separate, explicitly authorized operations.

## Branding decision

VensaOS is the public product brand.

“Feedback Inbox” may remain as a generic description of the feedback-inbox workflow or in historical records, but it is no longer the product name.

Stable backend entities, functions, fields, and API contracts retain their existing technical names to avoid unnecessary schema and migration risk. This includes the linked Base44 application identity, entity names such as `FeedbackSubmission`, function names such as `submit-feedback`, and fields such as `feedback_submission_id`.

VensaOS is a feedback intelligence platform, not a literal computer operating system.

## Base44 operations

The repository remains linked to its existing Base44 application. Do not rename the application slug, entities, functions, fields, automation identifiers, routes, tracking tokens, repository, or remote for branding purposes.

```bash
base44 login
base44 entities push
base44 deploy
```

The last command deploys and must only be run with explicit deployment approval.
