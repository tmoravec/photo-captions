/**
 * Formats an Instagram result as: <caption>\n.\n.\n.\n<hashtags>
 * Tags are joined as "#tag1 #tag2 …".
 * If tags is empty the trailing dot-separator lines are still added.
 * @param {string} caption
 * @param {string[]} tags
 * @returns {string}
 */
export function formatInstagramText(caption, tags) {
  const hashTags = (tags || []).map(t => `#${t}`).join(' ');
  return `${caption}\n.\n.\n.\n${hashTags}`;
}

/**
 * Parses an OpenRouter API response JSON object for a given image/platform.
 *
 * Returns one of:
 *   { success: true,  filename, platform, caption, tags }          (flickr/instagram)
 *   { success: true,  filename, platform, subreddits }             (reddit)
 *   { success: false, filename, platform, error }                  (any failure)
 *
 * @param {object} responseJson  - The parsed JSON body from the API response
 * @param {string} filename
 * @param {string} platform
 * @returns {object}
 */
export function parseApiResponse(responseJson, filename, platform) {
  try {
    // Validate top-level response shape
    if (
      !responseJson ||
      !Array.isArray(responseJson.choices) ||
      responseJson.choices.length === 0
    ) {
      return { success: false, filename, platform, error: 'Empty or missing choices in API response' };
    }

    const message = responseJson.choices[0]?.message?.content;
    if (typeof message !== 'string' || message.trim() === '') {
      return { success: false, filename, platform, error: 'Empty message content in API response' };
    }

    // Strip ```json ... ``` or ``` ... ``` fences
    let raw = message.trim();
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '');
    raw = raw.replace(/\s*```$/, '');

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return { success: false, filename, platform, error: `JSON parse error: ${e.message}` };
    }

    if (platform === 'reddit') {
      // Expect array of { subreddit, caption }
      if (!Array.isArray(parsed)) {
        return { success: false, filename, platform, error: 'Reddit response must be an array' };
      }
      for (const item of parsed) {
        if (typeof item.subreddit !== 'string' || item.subreddit.trim() === '') {
          return { success: false, filename, platform, error: 'Reddit item missing subreddit field' };
        }
        if (typeof item.caption !== 'string') {
          return { success: false, filename, platform, error: 'Reddit item missing caption field' };
        }
      }
      return {
        success: true,
        filename,
        platform,
        subreddits: parsed.map(item => ({
          subreddit: item.subreddit.trim(),
          caption: item.caption,
        })),
      };
    } else {
      // flickr / instagram — expect { caption, tags }
      if (typeof parsed.caption !== 'string' || parsed.caption.trim() === '') {
        return { success: false, filename, platform, error: 'Missing or empty caption field' };
      }
      if (!Array.isArray(parsed.tags)) {
        return { success: false, filename, platform, error: 'Missing or invalid tags field' };
      }
      const tags = parsed.tags.map(t => (typeof t === 'string' ? t.replace(/^#+/, '') : t));
      const caption = parsed.caption.trim();
      const exportText = platform === 'instagram'
        ? formatInstagramText(caption, tags)
        : `${caption}\n${tags.join(' ')}`;
      return {
        success: true,
        filename,
        platform,
        caption,
        tags,
        exportText,
      };
    }
  } catch (err) {
    return { success: false, filename, platform, error: `Unexpected error: ${err.message}` };
  }
}
