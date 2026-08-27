# Operations Runbook

## Service Startup

Run `npm ci`, `npm run check`, `npm test`, and `npm audit --omit=dev --audit-level=high` before startup. Use `PORT=65073 npm start` for the standard listener. The service accepts only integer ports from 1024 through 65535 and binds to `0.0.0.0` for approved LAN access.

```bash
curl http://127.0.0.1:65073/health
```

The state file is `data/credit-claims.json`. It is created after the first successful mutation. Back up only after a controlled stop or through a consistent filesystem snapshot process.

## Credit Operations

| Operation | Actor role | Expected state |
| --- | --- | --- |
| Submit measurement | `service_monitor` | `submitted` |
| Calculate credit | `service_monitor` | `calculated` or `no_credit_due` |
| Validate evidence | `service_evidence_reviewer` | `validated` |
| Approve credit | `contract_credit_authority` | `approved` |
| Issue credit | `finance_credit_registrar` | `issued` |

Every mutation requires `x-actor-id`, `x-actor-role`, and a unique `x-request-id`. Every action uses a nonempty JSON `note`. Before approval, confirm `calculation.applicableBand`, `uncappedCreditAmount`, `appliedCreditPct`, `creditAmount`, and `capped` against the contract record.

## Error Response Handling

| HTTP status | Error code | Operator response |
| --- | --- | --- |
| 403 | `forbidden` | Confirm actor identity and the role required for the current step. |
| 404 | `not_found` | Confirm claim identifier and action spelling. |
| 409 | `invalid_state` | Retrieve the claim, use a fresh request identifier, and apply only the permitted next action. |
| 422 | `invalid_input` | Correct contract fields, band schedule, percentage range, or evidence reference. |

A claim in `no_credit_due` requires no approval workflow. Retain the evidence record as the proof that target availability was achieved.

## Verification and Shutdown

Retrieve an issued claim through `GET /credit-claims/:id` and confirm `status` is `issued`, `calculation.creditAmount` is present, and the audit history has `credit_issued`. A fresh identifier sent to `issueCredit` after issuance must return HTTP 409 with `invalid_state`.

Send `SIGTERM` or `SIGINT` to stop the listener before process exit.
