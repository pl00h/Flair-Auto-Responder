# Flair Auto-responder

## About

Flair Auto-responder is a moderation bot built on the Reddit Developer Platform (Devvit). It creates a distinguished, pinned moderator comment when a post has a configured post flair.

### Highlights

- Configure any number of flair-based responses per subreddit.
- Reuse one response for several flair template IDs.
- Insert post, author, subreddit, permalink, and flair data into Markdown messages.
- Update one existing bot comment when a post moves between configured flairs.
- Remove the bot comment when the post no longer has a configured flair.
- Prevent duplicate responses when Reddit delivers overlapping post events.

## How to use

### 1. Install the app

Install Flair Auto-responder in the subreddit where it should run. The app account needs the moderation permissions required to distinguish and pin comments.

### 2. Find the flair template IDs

In Reddit's Mod Tools, open **Post Flair** and copy the ID for each flair that should trigger a response. A template ID generally looks like:

```text
099e12cb-6da5-4c9b-831d-7316dd18a3d6
```

Do not use the visible flair text as the ID. Template IDs remain stable when the text is edited.

### 3. Open the app settings

Open **Mod Tools → Installed Apps**, find Flair Auto-responder, and choose **Settings**. You can also visit:

```text
https://developers.reddit.com/r/YOUR_SUBREDDIT/apps/flair-auto-responder
```

### 4. Add the response configuration

Paste a JSON array into **Flair auto-responses (JSON)** and save it. An empty array (`[]`) is valid and disables all responses.

One response for one flair:

```json
[
  {
    "flairTemplateId": "7f6d64b0-0000-1111-2222-123456789abc",
    "message": "Hi u/{{author}}! Please review the rules for Question posts.\n\nPost: {{permalink}}"
  },
  {
    "flairTemplateId": "11111111-2222-3333-4444-555555555555",
    "message": "Thanks for sharing this with r/{{subreddit}}."
  }
]
```

One shared response for several flairs:

```json
[
  {
    "flairTemplateIds": [
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "ffffffff-1111-2222-3333-444444444444"
    ],
    "message": "Hello u/{{author}} — please include a source for this post."
  }
]
```

Messages use Reddit Markdown. Because the configuration is JSON, a line break inside a message must be written as `\n`; use `\n\n` for a new paragraph.

## Configuration reference

The setting is a JSON list of rule objects. Each rule selects one or more flair template IDs and defines the message to post.

### Rule fields

| Field | Value | Required | Placeholders | Description |
| --- | --- | --- | --- | --- |
| `flairTemplateId` | string | One ID field is required | No | A single post flair template ID. |
| `flairTemplateIds` | string array | One ID field is required | No | Several post flair template IDs that share this message. |
| `message` | string | Yes | Yes | Markdown body of the pinned moderator response. |

Use either `flairTemplateId` or `flairTemplateIds` in a rule, never both. Every flair template ID may appear only once across the entire configuration. The settings form rejects malformed JSON, empty messages, empty IDs, and duplicate IDs before saving.

### Placeholder inserts

Placeholders are replaced with data from the post that triggered the response.

| Placeholder | Inserted value | Example |
| --- | --- | --- |
| `{{author}}` | Post author's username, without `u/`; `[deleted]` if unavailable | `example_user` |
| `{{subreddit}}` | Subreddit name, without `r/` | `AskReddit` |
| `{{permalink}}` | Absolute Reddit permalink for the post | `https://www.reddit.com/r/example/comments/abc/title/` |
| `{{post_title}}` | Current post title | `How does this work?` |
| `{{post_url}}` | Submitted URL for a link/media post, otherwise its post URL | `https://example.com/article` |
| `{{flair_template_id}}` | Current post flair template ID | `099e12cb-6da5-4c9b-831d-7316dd18a3d6` |

Whitespace inside braces is allowed, so `{{ author }}` and `{{author}}` are equivalent. Placeholder names are case-insensitive. Unknown placeholders are left unchanged so a typo is visible instead of silently disappearing.

Example using several inserts:

```json
[
  {
    "flairTemplateId": "099e12cb-6da5-4c9b-831d-7316dd18a3d6",
    "message": "Hi u/{{author}}! Please review your post **{{post_title}}**.\n\nRead the r/{{subreddit}} posting guide before replying.\n\nPermanent link: {{permalink}}"
  }
]
```

## License

BSD 3-Clause License. See [LICENSE](LICENSE).
