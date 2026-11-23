import { describe, expect, it } from 'vitest';
import { findResponseRule, parseResponseRules } from '../src/config.js';

describe('parseResponseRules', () => {
  it('supports one or several flair template IDs per message', () => {
    const rules = parseResponseRules(`[
      {"flairTemplateId":"one","message":"First"},
      {"flairTemplateIds":["two","three"],"message":"Shared"}
    ]`);

    expect(findResponseRule(rules, 'one')?.message).toBe('First');
    expect(findResponseRule(rules, 'three')?.message).toBe('Shared');
  });

  it('rejects duplicate template IDs across rules', () => {
    expect(() =>
      parseResponseRules(`[
        {"flairTemplateId":"same","message":"First"},
        {"flairTemplateId":"same","message":"Second"}
      ]`)
    ).toThrow('configured more than once');
  });

  it('treats an empty setting as no rules', () => {
    expect(parseResponseRules(undefined)).toEqual([]);
    expect(parseResponseRules('  ')).toEqual([]);
  });
});
