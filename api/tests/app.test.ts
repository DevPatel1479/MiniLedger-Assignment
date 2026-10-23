import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db/pool';

const app = createApp();

afterAll(async () => { await pool.end(); });

describe('HTTP app', () => {
  it('returns a healthy status without a database-backed route', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('protects loan endpoints without a bearer token', async () => {
    const response = await request(app).get('/api/loans');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns a consistent not-found error for unknown routes', async () => {
    const response = await request(app).get('/api/this-route-does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
