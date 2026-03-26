import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPrompt, PLATFORMS } from '../lib/prompts.js';

test('getPrompt replaces CONTEXT_TO_REPLACE with provided context', () => {
  const context = 'A rainy afternoon at the old mill';
  const prompt = getPrompt('flickr', context);
  assert.ok(prompt.includes(context), 'prompt should contain the context string');
  assert.ok(!prompt.includes('CONTEXT_TO_REPLACE'), 'CONTEXT_TO_REPLACE should not remain in the prompt');
});

test('getPrompt works for instagram platform', () => {
  const context = 'Zřícenina na kopci';
  const prompt = getPrompt('instagram', context);
  assert.ok(prompt.includes(context));
  assert.ok(!prompt.includes('CONTEXT_TO_REPLACE'));
});

test('getPrompt works for reddit platform', () => {
  const context = 'Forest trail in Bohemia';
  const prompt = getPrompt('reddit', context);
  assert.ok(prompt.includes(context));
  assert.ok(!prompt.includes('CONTEXT_TO_REPLACE'));
});

test('getPrompt throws for unknown platform', () => {
  assert.throws(() => getPrompt('twitter', 'some context'), /Unknown platform/i);
});

test('PLATFORMS array contains exactly flickr, instagram, reddit', () => {
  assert.deepEqual([...PLATFORMS].sort(), ['flickr', 'instagram', 'reddit']);
});

test('getPrompt with empty context string replaces placeholder with empty string', () => {
  const prompt = getPrompt('flickr', '');
  assert.ok(!prompt.includes('CONTEXT_TO_REPLACE'));
});

test('getPrompt reddit with dimensions includes width and height', () => {
  const context = 'Sunset over the mountains';
  const prompt = getPrompt('reddit', context, { width: 3024, height: 4032 });
  assert.ok(prompt.includes('3024'), 'prompt should contain width');
  assert.ok(prompt.includes('4032'), 'prompt should contain height');
});

test('getPrompt reddit without dimensions does not contain DIMENSIONS_TO_REPLACE', () => {
  const context = 'Sunset over the mountains';
  const prompt = getPrompt('reddit', context);
  assert.ok(!prompt.includes('DIMENSIONS_TO_REPLACE'), 'DIMENSIONS_TO_REPLACE should not remain in the prompt');
});

test('getPrompt flickr ignores dimensions parameter', () => {
  const context = 'Sunset over the mountains';
  const withDims = getPrompt('flickr', context, { width: 3024, height: 4032 });
  const withoutDims = getPrompt('flickr', context);
  assert.equal(withDims, withoutDims, 'flickr prompt should be unaffected by dimensions');
});

test('getPrompt instagram ignores dimensions parameter', () => {
  const context = 'Sunset over the mountains';
  const withDims = getPrompt('instagram', context, { width: 3024, height: 4032 });
  const withoutDims = getPrompt('instagram', context);
  assert.equal(withDims, withoutDims, 'instagram prompt should be unaffected by dimensions');
});
