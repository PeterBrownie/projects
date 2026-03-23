// js/api-client.js
// Requires: js/storage.js

async function apiChat(messages, jsonSchema, options, settingsOverride) {
  const settings = settingsOverride || getSettings();
  const baseUrl = (settings.apiBaseUrl || '').replace(/\/$/, '');
  const apiKey = settings.apiKey || '';
  const model = settings.textModel || 'grok-4-1-fast-non-reasoning';

  const body = {
    model: model,
    messages: messages
  };

  if (jsonSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { strict: true, name: 'response', schema: jsonSchema }
    };
  }

  let response = await fetch(baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify(body)
  });

  // Structured output fallback: retry without response_format, inject schema as instructions
  if (!response.ok && jsonSchema && (response.status === 400 || response.status === 422)) {
    const errText = await response.text();
    if (errText.indexOf('response_format') !== -1 || errText.indexOf('json_schema') !== -1) {
      const fallbackMessages = messages.slice();
      const schemaInstruction = '\n\nRespond ONLY with valid JSON matching this schema:\n' + JSON.stringify(jsonSchema);
      if (fallbackMessages.length > 0 && fallbackMessages[0].role === 'system') {
        fallbackMessages[0] = Object.assign({}, fallbackMessages[0], {
          content: fallbackMessages[0].content + schemaInstruction
        });
      } else {
        fallbackMessages.unshift({ role: 'system', content: 'You are a helpful assistant.' + schemaInstruction });
      }
      const fallbackBody = Object.assign({}, body);
      delete fallbackBody.response_format;
      fallbackBody.messages = fallbackMessages;
      response = await fetch(baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify(fallbackBody)
      });
    }
  }

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error('API error ' + response.status + ': ' + errBody);
  }

  const data = await response.json();
  const content = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';

  if (jsonSchema) {
    // Try to parse JSON from content
    try {
      return JSON.parse(content);
    } catch (e) {
      // KNOWN GAP (Plan 1): extractFirstJsonObject is defined in api-functions.js (Plan 2).
      // Until Plan 2 is loaded, this path returns the raw string.
      // Plan 2 MUST verify that apiChat returns a parsed object in the fallback path
      // by testing a schema call against a local server that rejects response_format.
      if (typeof extractFirstJsonObject === 'function') {
        return extractFirstJsonObject(content) || content;
      }
      return content;
    }
  }
  return content;
}

async function apiImage(prompt) { // Feature sisabled by default for regular front-end.
  const settings = getSettings();
  const baseUrl = (settings.apiBaseUrl || '').replace(/\/$/, '');
  const apiKey = settings.apiKey || '';
  const model = settings.imageModel || 'grok-imagine-image-pro';

  const response = await fetch(baseUrl + '/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({ model: model, prompt: prompt })
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error('Image API error ' + response.status + ': ' + errBody);
  }

  const data = await response.json();
  const item = data.data && data.data[0] ? data.data[0] : {};
  const revisedPrompt = item.revised_prompt || '';

  let dataUrl = '';
  if (item.b64_json) {
    dataUrl = 'data:image/png;base64,' + item.b64_json;
  } else if (item.url) {
    // Fetch URL and convert to data URL
    const imgResp = await fetch(item.url);
    if (!imgResp.ok) {
      throw new Error('Failed to fetch image URL: ' + imgResp.status);
    }
    const blob = await imgResp.blob();
    dataUrl = await new Promise(function(resolve) {
      const reader = new FileReader();
      reader.onload = function(e) { resolve(e.target.result); };
      reader.readAsDataURL(blob);
    });
  }

  if (!dataUrl) {
    throw new Error('Image API returned no image data');
  }

  return { dataUrl: dataUrl, revisedPrompt: revisedPrompt };
}

// Test Connection: send a minimal chat completion to verify key + endpoint
async function testApiConnection(settingsOverride) {
  const messages = [
    { role: 'user', content: 'Reply with the single word: ok' }
  ];
  const response = await apiChat(messages, null, {}, settingsOverride);
  if (typeof response !== 'string' || response.trim().length === 0) {
    throw new Error('API returned an empty response');
  }
  return true;
}
