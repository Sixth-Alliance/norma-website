import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseApiError, calculateDeliveryFee } from '../app/api/action';

// Simple mock for global fetch
const globalAny: any = global;

describe('API helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parseApiError returns JSON message when body is JSON', async () => {
    const fakeResponse = new Response(JSON.stringify({ message: 'bad things' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const msg = await parseApiError(fakeResponse as any);
    expect(msg).toContain('bad things');
  });

  it('parseApiError returns text when body is plain text', async () => {
    const fakeResponse = new Response('plain error text', { status: 500, headers: { 'Content-Type': 'text/plain' } });
    const msg = await parseApiError(fakeResponse as any);
    expect(msg).toContain('plain error text');
  });

  it('calculateDeliveryFee calls backend and returns parsed data', async () => {
    const mockData = { data: { cart_id: 'c1', delivery_fee: '200.5', estimated_delivery_time: '15 mins', distance_km: 3.2, subtotal: 1000, total: 1200.5, currency: 'NGN', is_deliverable: true } };
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(mockData), { status: 200 }))));

    const req: any = { cart_id: 'c1', delivery_address_text: 'addr', fulfillment_mode: 'delivery' };
    const res = await calculateDeliveryFee(req as any);
    expect(res.cart_id).toBe('c1');
    expect(typeof res.delivery_fee).toBe('number');
  });
});
