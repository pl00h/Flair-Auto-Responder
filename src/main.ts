import { Devvit, type EventTypes, type TriggerContext } from '@devvit/public-api';
import { findResponseRule, parseResponseRules } from './config.js';
import { renderTemplate, type TemplateVariables } from './template.js';

const RESPONSES_SETTING = 'responses';
const STATE_PREFIX = 'flair-auto-responder:state:';
const LOCK_PREFIX = 'flair-auto-responder:lock:';
const REDDIT_ORIGIN = 'https://www.reddit.com';

type SupportedPostEvent = EventTypes.PostCreate | EventTypes.PostFlairUpdate;

type ResponseState = {
  commentId: `t1_${string}`;
  flairTemplateId: string;
  message: string;
};

Devvit.configure({ redditAPI: true, redis: true });

Devvit.addSettings({
  type: 'paragraph',
  name: RESPONSES_SETTING,
  label: 'Flair auto-responses (JSON)',
  helpText:
    'A JSON array of rules. Each rule needs flairTemplateId (or flairTemplateIds) and message. See README.md for examples and template variables.',
  scope: 'installation',
  onValidate: ({ value }) => {
    try {
      parseResponseRules(value);
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid response configuration.';
    }
  },
});

Devvit.addTrigger({
  event: 'PostCreate',
  onEvent: handlePost,
});

Devvit.addTrigger({
  event: 'PostFlairUpdate',
  onEvent: handlePost,
});

async function handlePost(event: SupportedPostEvent, context: TriggerContext): Promise<void> {
  const post = event.post;
  if (!post) {
    console.warn('Received a post event without a post payload.');
    return;
  }

  const postId = post.id as `t3_${string}`;
  const lockKey = `${LOCK_PREFIX}${postId}`;
  const lock = await context.redis.set(lockKey, String(Date.now()), {
    nx: true,
    expiration: new Date(Date.now() + 30_000),
  });

  if (!lock) return;

  try {
    // Read the current post instead of trusting event ordering or an older event snapshot.
    const currentPost = await context.reddit.getPostById(postId);
    const settingsValue = await context.settings.get<string>(RESPONSES_SETTING);
    const rules = parseResponseRules(settingsValue);
    const flairTemplateId = currentPost.flair?.templateId?.trim() ?? '';
    const rule = flairTemplateId
      ? findResponseRule(rules, flairTemplateId)
      : undefined;

    if (!rule) {
      await removeExistingResponse(postId, context);
      return;
    }

    const permalink = absoluteRedditUrl(currentPost.permalink);
    const variables: TemplateVariables = {
      author: currentPost.authorName || '[deleted]',
      subreddit: currentPost.subredditName,
      permalink,
      post_title: currentPost.title,
      post_url: currentPost.url || permalink,
      flair_template_id: flairTemplateId,
    };
    const message = renderTemplate(rule.message, variables);

    await upsertResponse(postId, flairTemplateId, message, context);
  } catch (error) {
    console.error(`Failed to process flair auto-response for ${postId}:`, error);
  } finally {
    await context.redis.del(lockKey);
  }
}

async function upsertResponse(
  postId: `t3_${string}`,
  flairTemplateId: string,
  message: string,
  context: TriggerContext
): Promise<void> {
  const stateKey = `${STATE_PREFIX}${postId}`;
  const existing = await readState(stateKey, context);

  if (existing) {
    try {
      const comment = await context.reddit.getCommentById(existing.commentId);
      if (existing.message !== message) {
        await comment.edit({ text: message });
      }
      if (!comment.stickied || comment.distinguishedBy !== 'moderator') {
        await comment.distinguish(true);
      }
      await writeState(stateKey, { commentId: existing.commentId, flairTemplateId, message }, context);
      return;
    } catch (error) {
      console.warn(`Could not reuse response ${existing.commentId}; creating a replacement.`, error);
      await context.redis.del(stateKey);
    }
  }

  const comment = await context.reddit.submitComment({
    id: postId,
    text: message,
    runAs: 'APP',
  });

  // Persist immediately so a transient distinguish failure cannot produce a duplicate comment.
  await writeState(stateKey, { commentId: comment.id, flairTemplateId, message }, context);
  await comment.distinguish(true);
}

async function removeExistingResponse(
  postId: `t3_${string}`,
  context: TriggerContext
): Promise<void> {
  const stateKey = `${STATE_PREFIX}${postId}`;
  const existing = await readState(stateKey, context);
  if (!existing) return;

  try {
    const comment = await context.reddit.getCommentById(existing.commentId);
    await comment.delete();
  } catch (error) {
    // A missing/already-deleted comment is also a successful cleanup from the app's perspective.
    console.warn(`Could not delete response ${existing.commentId}; clearing stale state.`, error);
  }
  await context.redis.del(stateKey);
}

async function readState(
  key: string,
  context: TriggerContext
): Promise<ResponseState | undefined> {
  const value = await context.redis.get(key);
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value) as Partial<ResponseState>;
    if (
      typeof parsed.commentId === 'string' &&
      parsed.commentId.startsWith('t1_') &&
      typeof parsed.flairTemplateId === 'string' &&
      typeof parsed.message === 'string'
    ) {
      return parsed as ResponseState;
    }
  } catch {
    // Invalid state is removed below and recreated on this event.
  }

  await context.redis.del(key);
  return undefined;
}

async function writeState(
  key: string,
  state: ResponseState,
  context: TriggerContext
): Promise<void> {
  await context.redis.set(key, JSON.stringify(state));
}

function absoluteRedditUrl(permalink: string): string {
  if (!permalink) return REDDIT_ORIGIN;
  if (/^https?:\/\//i.test(permalink)) return permalink;
  return `${REDDIT_ORIGIN}${permalink.startsWith('/') ? '' : '/'}${permalink}`;
}

export default Devvit;
