# Architecture

## Scope

The Contract Service-Level Credit Calculation Engine converts monthly availability evidence and pre-agreed contract terms into a reproducible credit record. It selects an availability upper-bound credit band, applies the contractual cap, distinguishes a target-meeting period from a credit-bearing period, and records separated review and issuance authority.

## Components

| Component | Responsibility |
| --- | --- |
| `src/app.mjs` | Routes, body limit, request identifiers, and structured error responses |
| `src/domain.mjs` | Claim lifecycle, role controls, idempotency, and audit events |
| `src/validation.mjs` | Contract, band, measurement, numeric, and actor validation |
| `src/policy.mjs` | Availability gap, band selection, cap application, and credit calculation |
| `src/store.mjs` | Missing-file recovery plus temporary-file write and atomic rename |
| `src/server.mjs` | Port validation, LAN listener, service construction, and controlled shutdown |

## Credit Policy

Credit bands use an `upperAvailabilityPct`. When a measured availability is below the target, the policy selects the lowest upper bound that still contains the observation. Lower availability therefore selects a more serious band. A target-meeting measurement has no applicable credit band and yields zero credit.

| Calculation output | Meaning |
| --- | --- |
| `availabilityGapPct` | Difference between target and measured availability, not below zero |
| `bandCreditPct` | Credit rate from the selected schedule band |
| `uncappedCreditAmount` | Monthly fee multiplied by the selected band rate |
| `appliedCreditPct` | Lesser of band rate and contractual maximum credit percentage |
| `creditAmount` | Monthly fee multiplied by applied credit rate |
| `capped` | Indicates the contractual maximum reduced the selected credit rate |

## Lifecycle Policy

| Current state | Action | Required role | Next state |
| --- | --- | --- | --- |
| New claim | `create` | `service_monitor` | `submitted` |
| `submitted` | `calculateCredit` | `service_monitor` | `calculated` or `no_credit_due` |
| `calculated` | `validateMeasurement` | `service_evidence_reviewer` | `validated` |
| `validated` | `approveCredit` | `contract_credit_authority` | `approved` |
| `approved` | `issueCredit` | `finance_credit_registrar` | `issued` |

`issued` is terminal. `no_credit_due` is also terminal because the submitted evidence met the contracted availability target.

## Persistence and Transport

The active data file is `data/credit-claims.json`. The store treats an absent file as an empty collection. On every accepted mutation, it writes a complete JSON document to a temporary path and atomically renames it into place. Request identifiers are checked across all stored claim events before a mutation is accepted.

`POST /credit-claims` creates a claim, `GET /credit-claims/:id` retrieves one, and `POST /credit-claims/:id/:action` applies the allowed lifecycle action. Invalid input uses HTTP 422 with `invalid_input`, role errors use HTTP 403 with `forbidden`, unknown resources use HTTP 404 with `not_found`, and invalid state or replay uses HTTP 409 with `invalid_state`.
