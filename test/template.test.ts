import { describe, expect, it } from 'vitest';
import { renderTemplate, type TemplateVariables } from '../src/template.js';

const variables: TemplateVariables = {
  author: 'example_user',
  subreddit: 'example',
  permalink: 'https://www.reddit.com/r/example/comments/abc/title/',
  post_title: 'A title',
  post_url: 'https://www.reddit.com/r/example/comments/abc/title/',
  flair_template_id: 'flair-id',
};

describe('renderTemplate', () => {
  it('expands documented variables and optional whitespace', () => {
    expect(renderTemplate('Hi {{author}} in r/{{ subreddit }}', variables)).toBe(
      'Hi example_user in r/example'
    );
  });

  it('preserves unknown placeholders', () => {
    expect(renderTemplate('{{future_variable}}', variables)).toBe('{{future_variable}}');
  });
});
