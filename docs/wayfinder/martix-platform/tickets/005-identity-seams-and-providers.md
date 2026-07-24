---
title: Prepare stable identity seams and selectable providers
status: closed
type: wayfinder:grilling
parent: ../map.md
resolved: 2026-07-15
---

## Question

How should every application prepare for identity while keeping ASP.NET Core Identity optional?

## Resolution

Separate identity storage, authentication, and authorization. Application code consumes a stable actor context and authorization contracts without depending on `IdentityUser`, `ClaimsPrincipal`, HTTP, or a particular provider.

Business Modules store immutable actor identifiers without relational foreign keys to an identity entity. Optional provider capabilities include ASP.NET Core Identity and external OpenID Connect or OAuth providers such as Microsoft Entra ID. An isolated identity capability owns its storage, migrations, schemes, endpoints, policies, and verification.

Anonymous, user, service, and background actors are modeled deliberately. No permissive fake identity is used as a default.

## Rationale

Authentication providers change more frequently than business ownership. Stable application-facing seams prevent provider details from spreading into domain and application code. Avoiding cross-module foreign keys keeps business data valid if identity storage moves or becomes external.

Preparing authorization contracts early prevents a later security retrofit, while keeping the implementation optional avoids forcing account storage into externally authenticated applications.

## Alternatives considered

- Make ASP.NET Core Identity mandatory. Rejected because external identity providers and machine-to-machine applications do not need local account storage.
- Omit identity concepts until selected. Rejected because actor ownership, auditing, and authorization would then require invasive changes.
- Expose `ClaimsPrincipal` throughout application code. Rejected because it couples use cases to HTTP authentication representation.

## Evidence

Accepted during the Wayfinder charting interview; the exact provider matrix remains an open ticket.
