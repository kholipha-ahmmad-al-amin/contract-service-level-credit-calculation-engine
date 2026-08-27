import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ContractServiceCreditService } from '../src/domain.mjs';
import { calculateCredit } from '../src/policy.mjs';
import { AtomicStore } from '../src/store.mjs';
import { claim, MemoryStore, monitor } from './helpers.mjs';

describe('ContractServiceCreditService', () => {
  it('selects the applicable availability band and applies the contractual credit cap', () => {
    const result = calculateCredit({ ...claim, maximumCreditPct: 15 }); expect(result).toMatchObject({ meetsTarget: false, availabilityGapPct: 1.45, applicableBand: { upperAvailabilityPct: 99, creditPct: 20 }, bandCreditPct: 20, appliedCreditPct: 15, uncappedCreditAmount: 2000, creditAmount: 1500, capped: true });
  });

  it('records calculated, validated, approved, and issued credit under separated roles', () => {
    const store = new MemoryStore(); const service = new ContractServiceCreditService(store); let record = service.create(claim, monitor, 'claim-create-870'); record = service.transition(record.id, 'calculateCredit', { note: 'availability calculation completed' }, monitor, 'claim-calculate-870'); record = service.transition(record.id, 'validateMeasurement', { note: 'monitoring evidence validated' }, { id: 'reviewer-870', role: 'service_evidence_reviewer' }, 'claim-validate-870'); record = service.transition(record.id, 'approveCredit', { note: 'contract credit approved' }, { id: 'authority-870', role: 'contract_credit_authority' }, 'claim-approve-870'); record = service.transition(record.id, 'issueCredit', { note: 'credit issued' }, { id: 'registrar-870', role: 'finance_credit_registrar' }, 'claim-issue-870'); expect(record).toMatchObject({ status: 'issued', calculation: { creditAmount: 2000 } }); expect(record.events).toHaveLength(5); expect(store.writes).toBe(5);
  });

  it('marks a target-meeting measurement as no-credit-due and blocks credit validation', () => {
    const service = new ContractServiceCreditService(new MemoryStore()); let record = service.create({ ...claim, measuredAvailabilityPct: 99.96 }, monitor, 'no-credit-create-870'); record = service.transition(record.id, 'calculateCredit', { note: 'target achieved' }, monitor, 'no-credit-calculate-870'); expect(record).toMatchObject({ status: 'no_credit_due', calculation: { meetsTarget: true, creditAmount: 0 } }); expect(() => service.transition(record.id, 'validateMeasurement', { note: 'not permitted' }, { id: 'reviewer-870', role: 'service_evidence_reviewer' }, 'no-credit-validate-870')).toThrow('credit claim must be calculated');
  });

  it('rejects malformed bands, replayed identifiers, unauthorized actors, and terminal retries', () => {
    const service = new ContractServiceCreditService(new MemoryStore()); expect(() => service.create({ ...claim, creditBands: [] }, monitor, 'invalid-870')).toThrow('one through eight credit bands are required'); let record = service.create(claim, monitor, 'unique-870'); expect(() => service.create(claim, monitor, 'unique-870')).toThrow('request identifier was already used'); expect(() => service.transition(record.id, 'calculateCredit', { note: 'wrong actor' }, { id: 'reviewer', role: 'service_evidence_reviewer' }, 'role-870')).toThrow('role service_monitor is required'); record = service.transition(record.id, 'calculateCredit', { note: 'calculated' }, monitor, 'calculated-870'); record = service.transition(record.id, 'validateMeasurement', { note: 'validated' }, { id: 'reviewer', role: 'service_evidence_reviewer' }, 'validated-870'); record = service.transition(record.id, 'approveCredit', { note: 'approved' }, { id: 'authority', role: 'contract_credit_authority' }, 'approved-870'); record = service.transition(record.id, 'issueCredit', { note: 'issued' }, { id: 'registrar', role: 'finance_credit_registrar' }, 'issued-870'); expect(() => service.transition(record.id, 'issueCredit', { note: 'repeat' }, { id: 'registrar', role: 'finance_credit_registrar' }, 'terminal-870')).toThrow('credit claim must be approved');
  });

  it('recovers an absent credit-claim data file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'contract-credit-')); try { const store = new AtomicStore(join(directory, 'data', 'credit-claims.json')); expect(store.read()).toEqual({ creditClaims: [] }); } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
