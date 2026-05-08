import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { buildSearchLike } from '../services/productService.js';

// ── buildSearchLike ──────────────────────────────────────────────────────────

describe('buildSearchLike', () => {
  it('single word — starts-with has trailing %, contains-with has leading and trailing %', () => {
    const { startLike, containsLike } = buildSearchLike('leite');
    expect(startLike).toBe('leite%');
    expect(containsLike).toBe('%leite%');
  });

  it('two words joined by single space', () => {
    const { startLike, containsLike } = buildSearchLike('leite gordo');
    expect(startLike).toBe('leite%gordo%');
    expect(containsLike).toBe('%leite%gordo%');
  });

  it('multiple spaces between words are collapsed', () => {
    const { startLike, containsLike } = buildSearchLike('leite   gordo');
    expect(startLike).toBe('leite%gordo%');
    expect(containsLike).toBe('%leite%gordo%');
  });

  it('leading and trailing spaces do not produce empty tokens', () => {
    const { startLike, containsLike } = buildSearchLike('  leite gordo  ');
    expect(startLike).toBe('leite%gordo%');
    expect(containsLike).toBe('%leite%gordo%');
  });

  it('three or more words', () => {
    const { startLike, containsLike } = buildSearchLike('azeite virgem extra');
    expect(startLike).toBe('azeite%virgem%extra%');
    expect(containsLike).toBe('%azeite%virgem%extra%');
  });

  it('single word with surrounding spaces', () => {
    const { startLike, containsLike } = buildSearchLike('  arroz  ');
    expect(startLike).toBe('arroz%');
    expect(containsLike).toBe('%arroz%');
  });
});

// ── apiSearch — pagination ───────────────────────────────────────────────────

const mockSearchProducts = jest.fn();

jest.unstable_mockModule('../services/productService.js', () => ({
  buildSearchLike,
  searchProducts: mockSearchProducts,
  getAutocomplete: jest.fn(),
}));

const { apiSearch } = await import('../controllers/searchController.js');

function mockRes() {
  const res = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq(query) {
  return { query };
}

describe('apiSearch', () => {
  beforeEach(() => mockSearchProducts.mockReset());

  it('returns empty results when q is blank', async () => {
    const res = mockRes();
    await apiSearch(mockReq({ q: '' }), res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ results: [] });
    expect(mockSearchProducts).not.toHaveBeenCalled();
  });

  it('hasMore is true when results fill the requested limit', async () => {
    const fakeResults = Array.from({ length: 24 }, (_, i) => ({ id: i }));
    mockSearchProducts.mockResolvedValue(fakeResults);

    const res = mockRes();
    await apiSearch(mockReq({ q: 'leite', limit: '24', offset: '0' }), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ hasMore: true, results: fakeResults })
    );
  });

  it('hasMore is false when results are fewer than limit', async () => {
    const fakeResults = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    mockSearchProducts.mockResolvedValue(fakeResults);

    const res = mockRes();
    await apiSearch(mockReq({ q: 'leite', limit: '24', offset: '0' }), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ hasMore: false })
    );
  });

  it('passes offset to searchProducts', async () => {
    mockSearchProducts.mockResolvedValue([]);
    const res = mockRes();
    await apiSearch(mockReq({ q: 'leite', limit: '24', offset: '48' }), res, jest.fn());

    expect(mockSearchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 48 })
    );
  });

  it('clamps limit to 50', async () => {
    mockSearchProducts.mockResolvedValue([]);
    const res = mockRes();
    await apiSearch(mockReq({ q: 'leite', limit: '999' }), res, jest.fn());

    expect(mockSearchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    );
  });

  it('defaults offset to 0 when not provided', async () => {
    mockSearchProducts.mockResolvedValue([]);
    const res = mockRes();
    await apiSearch(mockReq({ q: 'leite' }), res, jest.fn());

    expect(mockSearchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0 })
    );
  });
});
