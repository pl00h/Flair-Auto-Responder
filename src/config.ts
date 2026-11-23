export type ResponseRule = {
  flairTemplateIds: string[];
  message: string;
};

type RawRule = {
  flairTemplateId?: unknown;
  flairTemplateIds?: unknown;
  message?: unknown;
};

export function parseResponseRules(value: string | undefined): ResponseRule[] {
  if (!value?.trim()) return [];

  let input: unknown;
  try {
    input = JSON.parse(value);
  } catch {
    throw new Error('Responses must be valid JSON.');
  }

  if (!Array.isArray(input)) {
    throw new Error('Responses must be a JSON array.');
  }

  const seenTemplateIds = new Set<string>();

  return input.map((item: unknown, index: number) => {
    if (!isRecord(item)) {
      throw new Error(`Rule ${index + 1} must be a JSON object.`);
    }

    const raw = item as RawRule;
    const ids = readTemplateIds(raw, index);

    if (typeof raw.message !== 'string' || raw.message.trim() === '') {
      throw new Error(`Rule ${index + 1} must have a non-empty message.`);
    }

    for (const id of ids) {
      if (seenTemplateIds.has(id)) {
        throw new Error(`Flair template ID "${id}" is configured more than once.`);
      }
      seenTemplateIds.add(id);
    }

    return { flairTemplateIds: ids, message: raw.message };
  });
}

export function findResponseRule(
  rules: ResponseRule[],
  flairTemplateId: string
): ResponseRule | undefined {
  return rules.find((rule) => rule.flairTemplateIds.includes(flairTemplateId));
}

function readTemplateIds(raw: RawRule, index: number): string[] {
  const singular = raw.flairTemplateId;
  const plural = raw.flairTemplateIds;

  if (singular !== undefined && plural !== undefined) {
    throw new Error(
      `Rule ${index + 1} must use flairTemplateId or flairTemplateIds, not both.`
    );
  }

  const values = plural !== undefined ? plural : [singular];
  if (!Array.isArray(values)) {
    throw new Error(`Rule ${index + 1} flairTemplateIds must be an array.`);
  }

  const ids = values.map((value) =>
    typeof value === 'string' ? value.trim() : ''
  );

  if (ids.length === 0 || ids.some((id) => id === '')) {
    throw new Error(
      `Rule ${index + 1} must include at least one non-empty flair template ID.`
    );
  }

  if (new Set(ids).size !== ids.length) {
    throw new Error(`Rule ${index + 1} contains a duplicate flair template ID.`);
  }

  return ids;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
