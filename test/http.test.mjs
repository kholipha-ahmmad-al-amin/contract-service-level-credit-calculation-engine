import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.mjs';
import { ContractServiceCreditService } from '../src/domain.mjs';
import { claim, MemoryStore, monitor } from './helpers.mjs';
const serviceApp = () => createApp(new ContractServiceCreditService(new MemoryStore()));
const headers = { 'x-actor-id': monitor.id, 'x-actor-role': monitor.role, 'x-request-id': 'http-create-870' };
describe('credit claim HTTP transport', () => {
  it('returns the caller request identifier and a new submitted credit claim', async () => { const response = await request(serviceApp()).post('/credit-claims').set(headers).send(claim); expect(response.status).toBe(201); expect(response.headers['x-request-id']).toBe(headers['x-request-id']); expect(response.body).toMatchObject({ status: 'submitted', contractId: 'CTR-870' }); });
  it('returns structured invalid-input and forbidden errors', async () => { const app = serviceApp(); const invalid = await request(app).post('/credit-claims').set(headers).send({ ...claim, monthlyFee: 0 }); const denied = await request(app).post('/credit-claims').set({ 'x-actor-id': 'reviewer-870', 'x-actor-role': 'service_evidence_reviewer', 'x-request-id': 'forbidden-870' }).send(claim); expect(invalid.status).toBe(422); expect(invalid.body.error.code).toBe('invalid_input'); expect(denied.status).toBe(403); expect(denied.body.error.code).toBe('forbidden'); });
  it('returns structured not-found errors for missing claims and unsupported actions', async () => { const app = serviceApp(); const missing = await request(app).get('/credit-claims/missing-870'); const created = await request(app).post('/credit-claims').set(headers).send(claim); const action = await request(app).post(`/credit-claims/${created.body.id}/unknownAction`).set({ ...headers, 'x-request-id': 'unknown-action-870' }).send({ note: 'unknown action' }); expect(missing.status).toBe(404); expect(missing.body.error.code).toBe('not_found'); expect(action.status).toBe(404); expect(action.body.error.code).toBe('not_found'); });
});
