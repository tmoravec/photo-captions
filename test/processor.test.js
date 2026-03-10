import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseApiResponse, formatInstagramText } from '../lib/processor.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(content) {
  return {
    choices: [
      { message: { content } },
    ],
  };
}

// ---------------------------------------------------------------------------
// formatInstagramText
// ---------------------------------------------------------------------------

test('formatInstagramText — formats caption and tags correctly', () => {
  const result = formatInstagramText('Okno zarostlé břečťanem', ['abandoned', 'decay', 'urbex']);
  assert.equal(result, 'Okno zarostlé břečťanem\n.\n.\n.\n#abandoned #decay #urbex');
});

test('formatInstagramText — empty tags still adds separator lines', () => {
  const result = formatInstagramText('Just a caption', []);
  assert.equal(result, 'Just a caption\n.\n.\n.\n');
});

// ---------------------------------------------------------------------------
// flickr / instagram happy path
// ---------------------------------------------------------------------------

test('flickr happy path — plain JSON', () => {
  const response = makeResponse(JSON.stringify({ caption: 'Rusty gate in the rain', tags: ['rust', 'decay', 'rain'] }));
  const result = parseApiResponse(response, 'photo.jpg', 'flickr');
  assert.equal(result.success, true);
  assert.equal(result.caption, 'Rusty gate in the rain');
  assert.deepEqual(result.tags, ['rust', 'decay', 'rain']);
  assert.equal(result.filename, 'photo.jpg');
  assert.equal(result.platform, 'flickr');
  assert.equal(result.exportText, 'Rusty gate in the rain\nrust decay rain');
});

test('instagram happy path — plain JSON', () => {
  const response = makeResponse(JSON.stringify({ caption: 'Okno zarostlé břečťanem', tags: ['abandoned', 'decay'] }));
  const result = parseApiResponse(response, 'img.jpg', 'instagram');
  assert.equal(result.success, true);
  assert.equal(result.caption, 'Okno zarostlé břečťanem');
  assert.deepEqual(result.tags, ['abandoned', 'decay']);
  assert.equal(result.exportText, 'Okno zarostlé břečťanem\n.\n.\n.\n#abandoned #decay');
});

test('tags with leading # are stripped to bare words', () => {
  const response = makeResponse(JSON.stringify({ caption: 'Dítě pije pivo', tags: ['#cesko', '#retro', '##double'] }));
  const result = parseApiResponse(response, 'img.jpg', 'instagram');
  assert.equal(result.success, true);
  assert.deepEqual(result.tags, ['cesko', 'retro', 'double']);
  assert.equal(result.exportText, 'Dítě pije pivo\n.\n.\n.\n#cesko #retro #double');
});

// ---------------------------------------------------------------------------
// Fence stripping
// ---------------------------------------------------------------------------

test('strips ```json ... ``` fences correctly', () => {
  const inner = JSON.stringify({ caption: 'Foggy ruins', tags: ['fog', 'ruins'] });
  const response = makeResponse('```json\n' + inner + '\n```');
  const result = parseApiResponse(response, 'x.jpg', 'flickr');
  assert.equal(result.success, true);
  assert.equal(result.caption, 'Foggy ruins');
});

test('strips plain ``` ... ``` fences correctly', () => {
  const inner = JSON.stringify({ caption: 'Dark corridor', tags: ['dark'] });
  const response = makeResponse('```\n' + inner + '\n```');
  const result = parseApiResponse(response, 'x.jpg', 'flickr');
  assert.equal(result.success, true);
  assert.equal(result.caption, 'Dark corridor');
});

// ---------------------------------------------------------------------------
// reddit happy path
// ---------------------------------------------------------------------------

test('reddit happy path', () => {
  const data = [
    { subreddit: 'EarthPorn', caption: 'Misty forest at dawn' },
    { subreddit: 'AbandonedPorn', caption: 'Collapsed ceiling' },
    { subreddit: 'czechrepublic', caption: 'Old mill in Bohemia' },
  ];
  const response = makeResponse(JSON.stringify(data));
  const result = parseApiResponse(response, 'photo.jpg', 'reddit');
  assert.equal(result.success, true);
  assert.equal(result.subreddits.length, 3);
  assert.equal(result.subreddits[0].subreddit, 'EarthPorn');
  assert.equal(result.subreddits[0].caption, 'Misty forest at dawn');
});

// ---------------------------------------------------------------------------
// Failure cases
// ---------------------------------------------------------------------------

test('missing caption field → success: false', () => {
  const response = makeResponse(JSON.stringify({ tags: ['a', 'b'] }));
  const result = parseApiResponse(response, 'x.jpg', 'flickr');
  assert.equal(result.success, false);
  assert.match(result.error, /caption/i);
});

test('missing tags field → success: false', () => {
  const response = makeResponse(JSON.stringify({ caption: 'Some caption' }));
  const result = parseApiResponse(response, 'x.jpg', 'flickr');
  assert.equal(result.success, false);
  assert.match(result.error, /tags/i);
});

test('reddit response is object instead of array → success: false', () => {
  const response = makeResponse(JSON.stringify({ subreddit: 'EarthPorn', caption: 'foo' }));
  const result = parseApiResponse(response, 'x.jpg', 'reddit');
  assert.equal(result.success, false);
  assert.match(result.error, /array/i);
});

test('reddit item missing subreddit field → success: false', () => {
  const data = [{ caption: 'foo' }];
  const response = makeResponse(JSON.stringify(data));
  const result = parseApiResponse(response, 'x.jpg', 'reddit');
  assert.equal(result.success, false);
  assert.match(result.error, /subreddit/i);
});

test('completely invalid JSON → success: false', () => {
  const response = makeResponse('this is not json at all');
  const result = parseApiResponse(response, 'x.jpg', 'flickr');
  assert.equal(result.success, false);
  assert.match(result.error, /JSON parse error/i);
});

test('empty choices array → success: false', () => {
  const result = parseApiResponse({ choices: [] }, 'x.jpg', 'flickr');
  assert.equal(result.success, false);
  assert.match(result.error, /choices/i);
});

test('null response → success: false', () => {
  const result = parseApiResponse(null, 'x.jpg', 'flickr');
  assert.equal(result.success, false);
});

test('missing choices key → success: false', () => {
  const result = parseApiResponse({}, 'x.jpg', 'flickr');
  assert.equal(result.success, false);
});
