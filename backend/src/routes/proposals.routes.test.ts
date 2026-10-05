import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import proposalsRoutes, { resetProposalsForTests } from './proposals.routes';
import { errorHandler } from '../shared/middleware/error.middleware';
import { logger } from '../shared/utils/logger';

const SECRET = 'test-jwt-secret';
const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

const lead = {
  company_name: 'Northwind Books',
  contact_name: 'Amina Example',
  email: 'amina@example.com',
  phone: '+254700000000',
  company_size: '1-10',
  industry: 'retail',
  countries: ['KE'],
  needs_offline: false,
  modules_needed: ['accounting'],
  additional_info: 'Need VAT reports',
  national_id: 'should-not-persist',
};

function app() {
  const server = express();
  server.use(express.json());
  server.use('/api/v1/proposals', proposalsRoutes);
  server.use(errorHandler);
  return server;
}

function tokenFor(tenantId: string, secret = SECRET): string {
  return jwt.sign({ userId: `user-${tenantId}`, tenantId }, secret);
}

describe('proposal access control', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalIntake = process.env.PROPOSALS_INTAKE_TENANT_ID;

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    delete process.env.PROPOSALS_INTAKE_TENANT_ID;
    resetProposalsForTests();
  });

  afterAll(async () => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
    if (originalIntake === undefined) {
      delete process.env.PROPOSALS_INTAKE_TENANT_ID;
    } else {
      process.env.PROPOSALS_INTAKE_TENANT_ID = originalIntake;
    }
    resetProposalsForTests();
    await new Promise<void>((resolve) => {
      logger.once('finish', () => resolve());
      logger.end();
    });
  });

  it('rejects unauthenticated reads and mutations with 401', async () => {
    const server = app();
    const id = '11111111-1111-1111-1111-111111111111';

    const list = await request(server).get('/api/v1/proposals');
    const one = await request(server).get(`/api/v1/proposals/${id}`);
    const status = await request(server).patch(`/api/v1/proposals/${id}/status`).send({ status: 'approved' });
    const invoice = await request(server).post(`/api/v1/proposals/${id}/invoice`).send({});

    for (const response of [list, one, status, invoice]) {
      expect(response.status).toBe(401);
      expect(JSON.stringify(response.body)).not.toContain(lead.email);
      expect(JSON.stringify(response.body)).not.toContain(lead.phone);
    }
  });

  it('fails closed when JWT_SECRET is unset', async () => {
    delete process.env.JWT_SECRET;
    const response = await request(app())
      .get('/api/v1/proposals')
      .set('Authorization', `Bearer ${tokenFor(TENANT_A, 'other-secret')}`);

    expect(response.status).toBe(401);
    expect(JSON.stringify(response.body)).not.toContain(lead.email);
  });

  it('rejects a token that has no tenant', async () => {
    const token = jwt.sign({ userId: 'user-only' }, SECRET);
    const response = await request(app())
      .get('/api/v1/proposals')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('does not store a public proposal when intake tenant is unset', async () => {
    const created = await request(app()).post('/api/v1/proposals').send(lead);
    expect(created.status).toBe(503);

    const list = await request(app())
      .get('/api/v1/proposals')
      .set('Authorization', `Bearer ${tokenFor(TENANT_A)}`);

    expect(list.status).toBe(200);
    expect(list.body).toEqual([]);
  });

  it('returns 404 for another tenant and only the fields the UI renders', async () => {
    process.env.PROPOSALS_INTAKE_TENANT_ID = TENANT_A;
    const server = app();

    const created = await request(server).post('/api/v1/proposals').send(lead);
    expect(created.status).toBe(201);
    expect(created.body.email).toBeUndefined();
    expect(created.body.phone).toBeUndefined();
    expect(JSON.stringify(created.body)).not.toContain(lead.email);
    expect(JSON.stringify(created.body)).not.toContain('should-not-persist');

    const id = created.body.id as string;

    const ownerList = await request(server)
      .get('/api/v1/proposals')
      .set('Authorization', `Bearer ${tokenFor(TENANT_A)}`);
    expect(ownerList.status).toBe(200);
    expect(ownerList.body).toHaveLength(1);
    expect(ownerList.body[0]).toEqual({
      id,
      company_name: lead.company_name,
      contact_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone,
      company_size: lead.company_size,
      industry: lead.industry,
      countries: lead.countries,
      needs_offline: false,
      modules_needed: lead.modules_needed,
      additional_info: lead.additional_info,
      status: 'pending',
      created_at: ownerList.body[0].created_at,
    });
    expect(ownerList.body[0].tenantId).toBeUndefined();
    expect(ownerList.body[0].national_id).toBeUndefined();

    const otherList = await request(server)
      .get('/api/v1/proposals')
      .set('Authorization', `Bearer ${tokenFor(TENANT_B)}`);
    expect(otherList.status).toBe(200);
    expect(otherList.body).toEqual([]);
    expect(JSON.stringify(otherList.body)).not.toContain(lead.email);

    const missing = await request(server)
      .get('/api/v1/proposals/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${tokenFor(TENANT_A)}`);
    const crossRead = await request(server)
      .get(`/api/v1/proposals/${id}`)
      .set('Authorization', `Bearer ${tokenFor(TENANT_B)}`);
    expect(crossRead.status).toBe(404);
    expect(crossRead.body).toEqual(missing.body);
    expect(JSON.stringify(crossRead.body)).not.toContain(lead.email);

    const crossStatus = await request(server)
      .patch(`/api/v1/proposals/${id}/status`)
      .set('Authorization', `Bearer ${tokenFor(TENANT_B)}`)
      .send({ status: 'approved' });
    expect(crossStatus.status).toBe(404);
    expect(JSON.stringify(crossStatus.body)).not.toContain(lead.email);

    const crossInvoice = await request(server)
      .post(`/api/v1/proposals/${id}/invoice`)
      .set('Authorization', `Bearer ${tokenFor(TENANT_B)}`)
      .send({
        proposal: {
          email: 'injected@example.com',
          phone: '+10000000000',
          company_name: 'Injected Co',
        },
      });
    expect(crossInvoice.status).toBe(404);
    expect(JSON.stringify(crossInvoice.body)).not.toContain(lead.email);
    expect(JSON.stringify(crossInvoice.body)).not.toContain('injected@example.com');

    const stillPending = await request(server)
      .get(`/api/v1/proposals/${id}`)
      .set('Authorization', `Bearer ${tokenFor(TENANT_A)}`);
    expect(stillPending.status).toBe(200);
    expect(stillPending.body.status).toBe('pending');

    const invoiced = await request(server)
      .post(`/api/v1/proposals/${id}/invoice`)
      .set('Authorization', `Bearer ${tokenFor(TENANT_A)}`)
      .send({
        proposal: { email: 'injected@example.com', phone: lead.phone },
      });
    expect(invoiced.status).toBe(200);
    const invoicedBody = JSON.stringify(invoiced.body);
    expect(invoicedBody).not.toContain(lead.email);
    expect(invoicedBody).not.toContain(lead.phone);
    expect(invoicedBody).not.toContain('injected@example.com');
    expect(invoiced.body.proposal).toEqual({ id, status: 'invoiced' });
    expect(invoiced.body.invoice.customer).toBeUndefined();
  });

  it('lets an authenticated caller own a proposal without the intake tenant', async () => {
    const server = app();
    const created = await request(server)
      .post('/api/v1/proposals')
      .set('Authorization', `Bearer ${tokenFor(TENANT_B)}`)
      .send(lead);

    expect(created.status).toBe(201);

    const owner = await request(server)
      .get(`/api/v1/proposals/${created.body.id}`)
      .set('Authorization', `Bearer ${tokenFor(TENANT_B)}`);
    const other = await request(server)
      .get(`/api/v1/proposals/${created.body.id}`)
      .set('Authorization', `Bearer ${tokenFor(TENANT_A)}`);

    expect(owner.status).toBe(200);
    expect(other.status).toBe(404);
    expect(other.body).toEqual({ error: 'Proposal not found' });
  });
});
