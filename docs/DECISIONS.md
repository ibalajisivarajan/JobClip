# Architecture Decision Records

## ADR-001: Keep simple V1 repo structure

- Status: Accepted
- Date: 2026-06-11

### Context

The requested V1 structure is simple: `web/`, `extension/`, `supabase/`, and `docs/`. A monorepo layout could help later if shared packages grow, but it adds migration risk now.

### Decision

Keep the current simple structure for stabilization. Root npm scripts orchestrate tests and web commands without migrating to workspaces.

### Consequences

- Lower risk for V1.
- Some duplication may remain between extension and tests.
- Revisit `apps/web`, `apps/extension`, and shared packages after V1 is stable.

## ADR-002: Use DOM-only extractors for V1

- Status: Accepted
- Date: 2026-06-11

### Context

The product explicitly excludes AI, external scraping APIs, background crawling, and mass scraping.

### Decision

Extractors run only in the active tab and use visible DOM/text, JSON-LD, and common selectors.

### Consequences

- Extraction quality varies by job site.
- User privacy and product constraints are preserved.

## ADR-003: Use Supabase RLS as jobs authorization boundary

- Status: Accepted
- Date: 2026-06-11

### Context

Both the dashboard and extension are public clients using only the anon key.

### Decision

All `jobs` access must go through authenticated Supabase sessions and RLS policies enforcing `auth.uid() = user_id`.

### Consequences

- Client queries may rely on RLS instead of duplicating filters everywhere.
- The migration must be applied before production use.

## ADR-004: Add dashboard Add Job ingestion channel

- Status: Accepted
- Date: 2026-06-11

### Context

The Chrome extension workflow works for desktop Chrome job pages, but jobs are often discovered on mobile, in LinkedIn mobile, WhatsApp, recruiter emails, Gmail, and other non-desktop contexts. Those users may only have a URL or copied job description.

### Decision

Add `/dashboard/jobs/new` as a new ingestion channel without replacing or modifying the Chrome extension workflow. The page supports pasted URL, pasted job description, and pasted URL plus description modes. URL fetching only processes URLs explicitly provided by the authenticated user. Parsing remains rules-based and local; V1 does not use AI, scraping proxies, external scraping APIs, background crawling, or service role keys.

### Consequences

- JobClip supports mobile and recruiter-driven job discovery.
- Extraction quality remains best-effort because it is rules-based and does not bypass protected pages.
- LinkedIn URL fetches may fail; users are instructed to paste the job description manually.
- `capture_method` records whether a row came from the extension, manual URL, or manual text.
