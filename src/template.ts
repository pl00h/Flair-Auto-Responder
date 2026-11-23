export const TEMPLATE_VARIABLES = [
  'author',
  'subreddit',
  'permalink',
  'post_title',
  'post_url',
  'flair_template_id',
] as const;

export type TemplateVariables = Record<(typeof TEMPLATE_VARIABLES)[number], string>;

export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/{{\s*([a-z_]+)\s*}}/gi, (placeholder, name: string) => {
    const key = name.toLowerCase() as keyof TemplateVariables;
    return Object.hasOwn(variables, key) ? variables[key] : placeholder;
  });
}
