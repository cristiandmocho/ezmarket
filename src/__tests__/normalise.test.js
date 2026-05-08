import { describe, it, expect } from '@jest/globals';
import {
  normaliseText,
  normaliseProductName,
  extractPackSize,
  trigramSimilarity,
} from '../jobs/normalise.js';

// ---------------------------------------------------------------------------
// normaliseText
// ---------------------------------------------------------------------------

describe('normaliseText', () => {
  it('lowercases input', () => {
    expect(normaliseText('LEITE GORDO')).toBe('leite gordo');
  });

  it('strips diacritics', () => {
    expect(normaliseText('Não')).toBe('nao');
    expect(normaliseText('Pão')).toBe('pao');
    expect(normaliseText('Iogurte')).toBe('iogurte');
  });

  it('collapses extra whitespace', () => {
    expect(normaliseText('  leite   gordo  ')).toBe('leite gordo');
  });

  it('replaces non-alphanumeric with space', () => {
    expect(normaliseText('leite-gordo')).toBe('leite gordo');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(normaliseText(null)).toBe('');
    expect(normaliseText(undefined)).toBe('');
    expect(normaliseText('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// normaliseProductName
// ---------------------------------------------------------------------------

describe('normaliseProductName', () => {
  it('produces identical output for different word orders', () => {
    const a = normaliseProductName('Leite Gordo Parmalat 1L', 'Parmalat');
    const b = normaliseProductName('Parmalat Leite Gordo 1L', 'Parmalat');
    expect(a).toBe(b);
  });

  it('removes brand tokens', () => {
    const result = normaliseProductName('Activia Iogurte Natural 4x125g', 'Activia');
    expect(result).not.toContain('activia');
  });

  it('removes size tokens', () => {
    const result = normaliseProductName('Leite Gordo Parmalat 1L', 'Parmalat');
    expect(result).not.toMatch(/\d/);          // no digits
    expect(result).not.toMatch(/\b1l\b/);      // no standalone size token
  });

  it('removes multi-pack size tokens', () => {
    const result = normaliseProductName('Iogurte Natural Activia 4x125g', 'Activia');
    expect(result).not.toContain('4');
    expect(result).not.toContain('125');
  });

  it('produces different output for meaningfully different variants', () => {
    const whole   = normaliseProductName('Leite Gordo Parmalat 1L', 'Parmalat');
    const skimmed = normaliseProductName('Leite Meio-Gordo Parmalat 1L', 'Parmalat');
    expect(whole).not.toBe(skimmed);
  });

  it('handles null brand gracefully', () => {
    expect(() => normaliseProductName('Arroz Agulha', null)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// extractPackSize
// ---------------------------------------------------------------------------

describe('extractPackSize', () => {
  it('extracts litre sizes and converts to ml', () => {
    expect(extractPackSize('Leite Gordo 1L', null, null)).toBe('1000ml');
    expect(extractPackSize('Água 1.5L', null, null)).toBe('1500ml');
  });

  it('extracts gram sizes as-is', () => {
    expect(extractPackSize('Frango 500g', null, null)).toBe('500g');
    expect(extractPackSize('Arroz 1kg', null, null)).toBe('1000g');
  });

  it('extracts centilitre sizes and converts to ml', () => {
    expect(extractPackSize('Cerveja 33cl', null, null)).toBe('330ml');
  });

  it('handles multi-packs', () => {
    expect(extractPackSize('Iogurte 4x125g', null, null)).toBe('500g');
    expect(extractPackSize('Cerveja 6x33cl', null, null)).toBe('1980ml');
    expect(extractPackSize('Água 6x1.5L', null, null)).toBe('9000ml');
  });

  it('returns null when no size token present', () => {
    expect(extractPackSize('Produto Genérico', null, null)).toBeNull();
    expect(extractPackSize('Frango Inteiro', null, null)).toBeNull();
  });

  it('handles comma as decimal separator', () => {
    expect(extractPackSize('Água 1,5L', null, null)).toBe('1500ml');
  });
});

// ---------------------------------------------------------------------------
// trigramSimilarity
// ---------------------------------------------------------------------------

describe('trigramSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(trigramSimilarity('gordo leite', 'gordo leite')).toBe(1);
  });

  it('returns 0 for empty / null inputs', () => {
    expect(trigramSimilarity('', 'leite')).toBe(0);
    expect(trigramSimilarity(null, 'leite')).toBe(0);
  });

  it('scores very different strings low', () => {
    expect(trigramSimilarity('gordo leite', 'sumo laranja')).toBeLessThan(0.3);
  });

  it('same product after normalisation scores 1.0', () => {
    const a = normaliseProductName('Leite Gordo Parmalat 1L', 'Parmalat');
    const b = normaliseProductName('Parmalat Leite Gordo 1L', 'Parmalat');
    expect(trigramSimilarity(a, b)).toBe(1);
  });

  it('different fat-content variants score below threshold (0.85)', () => {
    const gordo    = normaliseProductName('Leite Gordo Parmalat 1L', 'Parmalat');
    const meioGordo = normaliseProductName('Leite Meio-Gordo Parmalat 1L', 'Parmalat');
    expect(trigramSimilarity(gordo, meioGordo)).toBeLessThan(0.85);
  });

  it('Coca-Cola vs Coca-Cola Zero score below threshold', () => {
    const cola     = normaliseProductName('Coca-Cola 1.5L', 'Coca-Cola');
    const colaZero = normaliseProductName('Coca-Cola Zero 1.5L', 'Coca-Cola');
    expect(trigramSimilarity(cola, colaZero)).toBeLessThan(0.85);
  });
});
