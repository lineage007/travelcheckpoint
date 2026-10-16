import { describe, it, expect } from 'vitest';
import { parseQuery } from './query-parser';

/** Same UTC-day formatting the parser uses, so date assertions line up. */
const dayFromNow = (n: number) =>
  new Date(Date.now() + n * 86400000).toISOString().split('T')[0];

describe('parseQuery — routes', () => {
  it('parses a plain one-way route', () => {
    const p = parseQuery('Dubai to London tomorrow');
    expect(p.origin).toBe('DXB');
    expect(p.originCity).toBe('Dubai');
    expect(p.destination).toBe('LHR');
    expect(p.destinationCity).toBe('London');
    expect(p.isRegionSearch).toBe(false);
    expect(p.destinations).toBeUndefined();
  });

  it('does not mistake the words "one way" for an IATA code', () => {
    const p = parseQuery('one way Dubai to Singapore');
    expect(p.origin).toBe('DXB');
    expect(p.destination).toBe('SIN');
  });

  it('parses a return query the same way as a one-way (no return leg modelled)', () => {
    const p = parseQuery('Dubai to Bangkok return');
    expect(p.origin).toBe('DXB');
    expect(p.destination).toBe('BKK');
    expect(p.isDateRange).toBe(false);
    expect(p.departDates).toHaveLength(1);
  });

  it('parses a reversed route ("to X from Y")', () => {
    const p = parseQuery('to London from Dubai');
    expect(p.origin).toBe('DXB');
    expect(p.destination).toBe('LHR');
    expect(p.isRegionSearch).toBe(false);
  });

  it('uses the home airport as origin when the query names none', () => {
    const p = parseQuery('flights to Paris', 'SIN');
    expect(p.origin).toBe('SIN');
    expect(p.originCity).toBe('Singapore');
    expect(p.destination).toBe('CDG');
  });

  it('falls back to DXB when the home airport hint is not an IATA code', () => {
    const p = parseQuery('flights to Paris', 'not-a-code');
    expect(p.origin).toBe('DXB');
    expect(p.originCity).toBe('Dubai');
  });
});

describe('parseQuery — regions', () => {
  it('expands a region destination into multiple airports', () => {
    const p = parseQuery('Dubai to Europe');
    expect(p.isRegionSearch).toBe(true);
    expect(p.regionName).toBe('europe');
    expect(p.origin).toBe('DXB');
    expect(p.destination).toBeUndefined();
    expect(p.destinations!.length).toBeGreaterThan(1);
    expect(p.destinations!.map(d => d.code)).toContain('CDG');
  });

  it('lets an explicit region beat the "cheapest" anywhere keyword', () => {
    const p = parseQuery('Dubai to Europe, cheapest');
    expect(p.isRegionSearch).toBe(true);
    expect(p.regionName).toBe('europe');
    expect(p.preferences).toContain('cheapest');
  });

  it('treats a single-airport country as a normal destination', () => {
    const p = parseQuery('Dubai to Japan');
    expect(p.isRegionSearch).toBe(false);
    expect(p.destination).toBe('NRT');
  });
});

describe('parseQuery — passengers and cabin', () => {
  it('reads a digit passenger count', () => {
    expect(parseQuery('Dubai to Bangkok for 3 people').passengers).toBe(3);
  });

  it('reads "family of N"', () => {
    expect(parseQuery('Dubai to Bali family of 4').passengers).toBe(4);
  });

  it('reads "couple" as two passengers', () => {
    expect(parseQuery('Dubai to Paris for a couple').passengers).toBe(2);
  });

  it('defaults to one passenger and business cabin', () => {
    const p = parseQuery('Dubai to London');
    expect(p.passengers).toBe(1);
    expect(p.cabin).toBe('business');
    expect(p.currency).toBe('USD');
  });

  it('picks up first and economy cabin words', () => {
    expect(parseQuery('Dubai to Singapore first class').cabin).toBe('first');
    expect(parseQuery('cheapest economy Dubai to Bangkok').cabin).toBe('economy');
  });
});

describe('parseQuery — dates, stops and budget', () => {
  it('resolves "tomorrow" to a single date', () => {
    const p = parseQuery('Dubai to London tomorrow');
    expect(p.departDate).toBe(dayFromNow(1));
    expect(p.departDates).toEqual([dayFromNow(1)]);
    expect(p.isDateRange).toBe(false);
  });

  it('resolves "next week" to a seven-day range', () => {
    const p = parseQuery('Dubai to London next week');
    expect(p.isDateRange).toBe(true);
    expect(p.departDates).toHaveLength(7);
    expect(p.departDate).toBe(dayFromNow(7));
  });

  it('defaults to a week out when no date is given', () => {
    const p = parseQuery('Dubai to London');
    expect(p.departDate).toBe(dayFromNow(7));
    expect(p.isDateRange).toBe(false);
    expect(p.flexible).toBe(false);
  });

  it('flags flexible searches and spreads them over a week', () => {
    const p = parseQuery('Dubai to London flexible');
    expect(p.flexible).toBe(true);
    expect(p.isDateRange).toBe(true);
    expect(p.departDates).toHaveLength(7);
  });

  it('reads direct-only and budget constraints', () => {
    const p = parseQuery('Dubai to London direct under $2,000');
    expect(p.maxStops).toBe(0);
    expect(p.preferences).toContain('direct');
    expect(p.maxBudget).toBe(2000);
  });

  it('lets "all options" clear the stop limit', () => {
    const p = parseQuery('Dubai to London direct or all options');
    expect(p.maxStops).toBeNull();
    expect(p.preferences).toContain('allStops');
    expect(p.preferences).not.toContain('direct');
  });
});

describe('parseQuery — fallback', () => {
  it('falls back to DXB → LHR on an unparseable query', () => {
    const p = parseQuery('asdfghjkl qwertyuiop');
    expect(p.origin).toBe('DXB');
    expect(p.destination).toBe('LHR');
    expect(p.isRegionSearch).toBe(false);
    expect(p.cabin).toBe('business');
    expect(p.passengers).toBe(1);
    expect(p.maxStops).toBeNull();
    expect(p.maxBudget).toBeNull();
    expect(p.maxPoints).toBeNull();
    expect(p.preferences).toEqual([]);
  });
});
