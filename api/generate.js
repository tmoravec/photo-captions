import { getPrompt, PLATFORMS } from '../lib/prompts.js';
import { parseApiResponse } from '../lib/processor.js';

const MAX_RETRIES = 3;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export default async function handler(req, res) {
  const debug = process.env.DEBUG === 'true' || process.env.DEBUG === '1';

  // ── Startup env check (always logged so you can see it in the terminal) ───
  console.log('[generate] env check', {
    hasPassword: !!process.env.APP_PASSWORD,
    hasApiKey:   !!process.env.OPENROUTER_API_KEY,
    debug:       process.env.DEBUG,
    model:       process.env.MODEL,
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const appPassword = process.env.APP_PASSWORD;
  const providedToken = req.headers['x-auth-token'];

  if (!appPassword || providedToken !== appPassword) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // ── Method check ──────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  // Vercel parses application/json automatically.
  const { platform, context = '', filename, imageBase64, mimeType } = req.body ?? {};

  if (!PLATFORMS.includes(platform)) {
    res.status(400).json({ error: `Invalid platform. Must be one of: ${PLATFORMS.join(', ')}` });
    return;
  }

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    res.status(400).json({ error: 'imageBase64 is required' });
    return;
  }

  if (!filename || typeof filename !== 'string') {
    res.status(400).json({ error: 'filename is required' });
    return;
  }

  const resolvedMimeType = mimeType || 'image/jpeg';
  const model = process.env.MODEL || 'mistralai/pixtral-large-2411';

  // ── Build the prompt ───────────────────────────────────────────────────────
  let promptText;
  try {
    promptText = getPrompt(platform, context);
  } catch (err) {
    res.status(400).json({ error: err.message });
    return;
  }

  const temperature = 0.9;

  const requestPayload = {
    model,
    temperature,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: promptText,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${resolvedMimeType};base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
  };

  if (debug) {
    console.log('[generate] request', { platform, filename, model, temperature });
  }

  // ── Call OpenRouter with retry loop ───────────────────────────────────────
  let result = { success: false, filename, platform, error: 'No attempts made' };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let apiResponse;

    try {
      const fetchRes = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!fetchRes.ok) {
        const errorText = await fetchRes.text();
        result = {
          success: false,
          filename,
          platform,
          error: `API error ${fetchRes.status}: ${errorText}`,
        };
        // Non-200 from OpenRouter is not a JSON parse error; don't retry
        break;
      }

      apiResponse = await fetchRes.json();
    } catch (networkErr) {
      result = { success: false, filename, platform, error: `Network error: ${networkErr.message}` };
      // Network errors: retry
      continue;
    }

    result = parseApiResponse(apiResponse, filename, platform);

    if (debug) {
      console.log(`[generate] attempt ${attempt} result`, result);
    }

    if (result.success) {
      break;
    }

    // Only retry on JSON parse errors (bad LLM output); give up on shape errors
    if (result.error && !result.error.startsWith('JSON parse error')) {
      break;
    }
  }

  res.status(200).json(result);
}
