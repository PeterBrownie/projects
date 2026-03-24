// js/settings.js
// Requires: js/storage.js, js/api-client.js

// ---------------------------------------------------------------------------
// This blob is my encrypted personal API key. Unlockable through a few secret
// steps and a secret passkey. Will likely rotate this API key regularly.
// ---------------------------------------------------------------------------
var DEMO_KEY_BLOB = 'CPhn0cWNTi6IHnSUCb8kkWpbsrnzakx7NoKaLdjEVQjVrMKBmR+9y8KIXnxAdlJ3ftp2D7MGfNXDlCBg1SPkie7zoI1lnKGf+CivnSWcPzaOXgO4JnqFg7Nz0LCEmNW2J0zMNNzUX9smui+WsYoXakAHrCbnZFF2IKoaMQS+9tU=';

(function() {
  var apiKeyLabelClicks = 0;

  function injectSettingsUI() {
    // Overlay + modal
    const overlay = document.createElement('div');
    overlay.id = 'settingsOverlay';
    overlay.innerHTML = `
      <div id="settingsModal" role="dialog" aria-modal="true" aria-labelledby="settingsModalTitle">
        <h2 id="settingsModalTitle">Settings</h2>
        <div class="settings-field">
          <label for="settingsApiUrlSelect">API Base URL</label>
          <select id="settingsApiUrlSelect">
            <option value="https://api.x.ai/v1">xAI (Grok)</option>
            <option value="https://api.openai.com/v1">OpenAI</option>
            <option value="https://api.anthropic.com/v1">Anthropic</option>
            <option value="https://api.groq.com/openai/v1">Groq (less common)</option>
            <option value="https://openrouter.ai/api/v1">OpenRouter (less common)</option>
            <option value="__custom__">Custom endpoint URL…</option>
          </select>
          <input type="text" id="settingsApiUrl" placeholder="https://my-api.example.com/v1" autocomplete="off" style="display:none;margin-top:0.4em;" />
          <div id="settingsLocalhostWarning">
            ⚠ Local servers require opening the files locally — this won't work on the hosted site.
          </div>
        </div>
        <div class="settings-field">
          <label for="settingsApiKey">API Key</label>
          <input type="password" id="settingsApiKey" placeholder="Your API key" autocomplete="off" />
        </div>
        <div class="settings-demo-unlock" id="settingsDemoUnlockRow" style="display:none;">
          <input type="password" id="settingsDemoPassphrase" placeholder="Demo unlock code" autocomplete="off" />
          <button type="button" id="settingsDemoUnlockBtn">Unlock</button>
          <div id="settingsDemoUnlockMsg"></div>
        </div>
        <div class="settings-field" id="settingsTextModelField" style="display:none;">
          <label for="settingsTextModelSelect">Text Model <span id="settingsModelsFetchStatus"></span></label>
          <select id="settingsTextModelSelect">
            <option value="">— select or enter below —</option>
            <option value="__custom__">Custom model name…</option>
          </select>
          <input type="text" id="settingsTextModel" placeholder="grok-4-1-fast-non-reasoning" autocomplete="off" style="display:none;margin-top:0.4em;" />
        </div>
        <div class="settings-field" id="settingsImageModelField" style="display:none;">
          <label for="settingsImageModel">Image Model</label>
          <input type="text" id="settingsImageModel" placeholder="grok-imagine-image-pro" />
        </div>
        <div class="settings-toggle-row" id="settingsMatureContentRow" style="display:none;">
          <input type="checkbox" id="settingsMatureContent" />
          <label for="settingsMatureContent">Allow mature content</label>
        </div>
        <div id="settingsMatureAgeGate" style="display:none;">
          <div class="settings-age-gate">
            <input type="checkbox" id="settingsMatureAgeConfirm" />
            <label for="settingsMatureAgeConfirm">I confirm that I am 18 years of age or older</label>
          </div>
        </div>
        <div class="settings-actions">
          <button id="settingsSaveBtn">Save</button>
          <button id="settingsCancelBtn">Cancel</button>
          <button id="settingsTestBtn">Test Connection</button>
        </div>
        <div id="settingsTestResult"></div>
        <hr class="settings-divider" />
        <div class="settings-field">
          <label>Accent Color</label>
          <div id="settingsThemePicker">
            <button type="button" class="theme-swatch" data-hue="211" title="Blue"    style="background:hsl(211,74%,46%)"></button>
            <button type="button" class="theme-swatch" data-hue="270" title="Purple"  style="background:hsl(270,74%,46%)"></button>
            <button type="button" class="theme-swatch" data-hue="187" title="Teal"    style="background:hsl(187,74%,36%)"></button>
            <button type="button" class="theme-swatch" data-hue="142" title="Green"   style="background:hsl(142,60%,35%)"></button>
            <button type="button" class="theme-swatch" data-hue="355" title="Rose"    style="background:hsl(355,74%,46%)"></button>
            <button type="button" class="theme-swatch" data-hue="28"  title="Amber"   style="background:hsl(28,90%,46%)"></button>
          </div>
        </div>
        <hr class="settings-divider" />
        <div class="settings-portability">
          <button id="settingsExportBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="30px" height="30px" viewBox="0 0 20 20" fill="#FFFFFF" stroke="none" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm2-14c.28 0 .5.22.5.5v7.8l3.15-3.15a.5.5 0 0 1 .7.7l-4 4a.5.5 0 0 1-.7 0l-4-4a.5.5 0 1 1 .7-.7l3.15 3.14V2.5c0-.28.22-.5.5-.5Z"/></svg>
            Download Data Backup
          </button>
          <button id="settingsImportBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="30px" height="30px" viewBox="0 0 20 20" fill="#FFFFFF" stroke="none" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm2-4a.5.5 0 0 0 .5-.5V3.7l3.15 3.15a.5.5 0 0 0 .7-.7l-4-4a.5.5 0 0 0-.7 0l-4 4a.5.5 0 1 0 .7.7L9.5 3.71v7.79c0 .28.22.5.5.5Z"/></svg>
            Upload Data Backup
          </button>
        </div>
        <div id="settingsImportMsg"></div>
        <input type="file" id="settingsImportFile" accept=".json" style="display:none" />
        <div id="settingsClearDataRow" style="display:none;">
          <hr class="settings-divider" />
          <button id="settingsClearDataBtn" class="settings-clear-data-btn">Clear all local data</button>
          <div id="settingsClearDataMsg"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Wire events
    const phase1GearBtn = document.getElementById('settingsGearBtnPhase1');
    if (phase1GearBtn) phase1GearBtn.addEventListener('click', openSettings);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeSettings(); });
    document.getElementById('settingsSaveBtn').addEventListener('click', saveSettingsFromModal);
    document.getElementById('settingsCancelBtn').addEventListener('click', closeSettings);
    document.getElementById('settingsTestBtn').addEventListener('click', runTestConnection);
    document.getElementById('settingsApiUrlSelect').addEventListener('change', function() {
      syncUrlCustomInput();
      syncTextModelVisibility();
      syncMatureContentVisibility();
      checkLocalhostWarning();
      scheduleModelsFetch();
    });
    document.getElementById('settingsApiUrl').addEventListener('input', function() {
      checkLocalhostWarning();
      scheduleModelsFetch();
    });
    document.getElementById('settingsApiKey').addEventListener('input', function() {
      syncTextModelVisibility();
      scheduleModelsFetch();
    });
    document.getElementById('settingsTextModelSelect').addEventListener('change', syncModelCustomInput);
    document.getElementById('settingsMatureContent').addEventListener('change', syncAgeGate);
    document.getElementById('settingsExportBtn').addEventListener('click', exportData);
    document.getElementById('settingsImportBtn').addEventListener('click', function() {
      document.getElementById('settingsImportFile').click();
    });
    document.getElementById('settingsImportFile').addEventListener('change', importData);
    document.getElementById('settingsClearDataBtn').addEventListener('click', clearAllLocalData);
    document.querySelectorAll('.theme-swatch').forEach(function(btn) {
      btn.addEventListener('click', function() { applyTheme(btn.dataset.hue); });
    });

    // Demo unlock — revealed after clicking the "API Key" label 10 times
    if (DEMO_KEY_BLOB) {
      document.getElementById('settingsDemoUnlockBtn').addEventListener('click', runDemoUnlock);
      document.getElementById('settingsDemoPassphrase').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); runDemoUnlock(); }
      });
      document.querySelector('label[for="settingsApiKey"]').addEventListener('click', function() {
        apiKeyLabelClicks++;
        if (apiKeyLabelClicks >= 10) {
          document.getElementById('settingsDemoUnlockRow').style.display = '';
        }
      });
    }
  }

  var PRESET_URLS = [
    'https://api.x.ai/v1',
    'https://api.openai.com/v1',
    'https://api.anthropic.com/v1',
    'https://api.groq.com/openai/v1',
    'https://openrouter.ai/api/v1'
  ];

  function getActiveUrl() {
    const sel = document.getElementById('settingsApiUrlSelect');
    if (sel.value === '__custom__') return (document.getElementById('settingsApiUrl').value || '').trim();
    return sel.value;
  }

  function getActiveTextModel() {
    const sel = document.getElementById('settingsTextModelSelect');
    if (!sel.value || sel.value === '__custom__') return (document.getElementById('settingsTextModel').value || '').trim();
    return sel.value;
  }

  function syncUrlCustomInput() {
    const sel = document.getElementById('settingsApiUrlSelect');
    const customInput = document.getElementById('settingsApiUrl');
    customInput.style.display = sel.value === '__custom__' ? '' : 'none';
  }

  function syncTextModelVisibility() {
    const hasKey = (document.getElementById('settingsApiKey').value || '').trim().length > 0;
    const isCustomUrl = document.getElementById('settingsApiUrlSelect').value === '__custom__';
    document.getElementById('settingsTextModelField').style.display = (hasKey || isCustomUrl) ? '' : 'none';
  }

  function syncModelCustomInput() {
    const sel = document.getElementById('settingsTextModelSelect');
    const customInput = document.getElementById('settingsTextModel');
    customInput.style.display = (!sel.value || sel.value === '__custom__') ? '' : 'none';
  }

  function openSettings() {
    const s = getSettings();

    // URL select
    const urlSel = document.getElementById('settingsApiUrlSelect');
    if (PRESET_URLS.indexOf(s.apiBaseUrl) !== -1) {
      urlSel.value = s.apiBaseUrl;
    } else {
      urlSel.value = '__custom__';
      document.getElementById('settingsApiUrl').value = s.apiBaseUrl;
    }
    syncUrlCustomInput();

    document.getElementById('settingsApiKey').value = s.apiKey;

    // Text model — will be updated after fetch; set custom for now
    document.getElementById('settingsTextModel').value = s.textModel;
    const modelSel = document.getElementById('settingsTextModelSelect');
    modelSel.innerHTML = '<option value="">— select or enter below —</option><option value="__custom__">Custom model name…</option>';
    modelSel.value = '__custom__';
    syncModelCustomInput();

    document.getElementById('settingsImageModel').value = s.imageModel;
    syncMatureContentVisibility();
    document.getElementById('settingsMatureContent').checked = s.allowMatureContent;
    document.getElementById('settingsMatureAgeConfirm').checked = s.allowMatureContent;
    syncAgeGate();
    document.getElementById('settingsTestResult').textContent = '';
    document.getElementById('settingsImportMsg').textContent = '';
    document.getElementById('settingsClearDataMsg').textContent = '';
    checkLocalhostWarning();
    syncClearDataRow();
    syncTextModelVisibility();
    syncThemeSwatchActive(localStorage.getItem('storybound_accent_hue') || '211');
    if (DEMO_KEY_BLOB) {
      apiKeyLabelClicks = 0;
      document.getElementById('settingsDemoUnlockRow').style.display = 'none';
      document.getElementById('settingsDemoPassphrase').value = '';
      document.getElementById('settingsDemoUnlockMsg').textContent = '';
    }
    document.getElementById('settingsOverlay').classList.add('open');
  }

  // --- Model list fetch ---

  var modelsFetchTimer = null;

  function scheduleModelsFetch() {
    clearTimeout(modelsFetchTimer);
    modelsFetchTimer = setTimeout(fetchAvailableModels, 800);
  }

  async function fetchAvailableModels() {
    const url    = getActiveUrl().replace(/\/$/, '');
    const apiKey = (document.getElementById('settingsApiKey').value || '').trim();
    const statusEl = document.getElementById('settingsModelsFetchStatus');
    const modelSel = document.getElementById('settingsTextModelSelect');
    const currentModel = getActiveTextModel();

    if (!url || !apiKey || apiKey.length < 8) {
      statusEl.textContent = '';
      return;
    }

    statusEl.textContent = '⋯';
    statusEl.className = '';

    try {
      // Anthropic uses x-api-key + anthropic-version; everyone else uses Bearer
      const isAnthropic = url.indexOf('anthropic.com') !== -1;
      const headers = isAnthropic
        ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
        : { 'Authorization': 'Bearer ' + apiKey };

      const resp = await fetch(url + '/models' + (isAnthropic ? '?limit=1000' : ''), { headers: headers });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const json = await resp.json();

      const isOpenRouter = url.indexOf('openrouter.ai') !== -1;

      var rawModels = [];
      if (Array.isArray(json.data))        rawModels = json.data;
      else if (Array.isArray(json.models)) rawModels = json.models;
      else if (Array.isArray(json))        rawModels = json;

      var models = rawModels
        .filter(function(m) {
          if (!m || !(m.id || typeof m === 'string')) return false;
          var id = String(m.id || m);

          // OpenRouter: use architecture.modality — keep only text output models
          if (isOpenRouter && m.architecture && m.architecture.modality) {
            var modality = String(m.architecture.modality);
            // e.g. "text->text", "text+image->text" — exclude "text->image", "audio->text", etc.
            var outputPart = modality.split('->').pop();
            return outputPart.indexOf('text') !== -1;
          }

          // All other providers: blocklist known non-chat model ID patterns
          var lower = id.toLowerCase();
          var excluded = [
            'dall-e', 'tts-', 'whisper', 'embedding', 'moderation',
            '-imagine-', 'imagine-image', 'stable-diffusion',
            'text-to-image', 'image-generation', 'audio-'
          ];
          for (var i = 0; i < excluded.length; i++) {
            if (lower.indexOf(excluded[i]) !== -1) return false;
          }
          return true;
        })
        .map(function(m) {
          var id = String(m.id || m);
          var label = m.display_name || m.name || id;
          return { id: id, label: label };
        })
        .sort(function(a, b) { return a.id.localeCompare(b.id); });

      // Rebuild select: model options + Custom at the end
      var optionsHtml = models.map(function(m) {
        var escaped = m.id.replace(/"/g, '&quot;');
        var label = m.label !== m.id ? escapeHtml(m.label) + ' (' + escapeHtml(m.id) + ')' : escapeHtml(m.id);
        return '<option value="' + escaped + '">' + label + '</option>';
      }).join('');
      optionsHtml += '<option value="__custom__">Custom model name…</option>';
      modelSel.innerHTML = optionsHtml;

      // Restore previously saved model if it's in the list, else select custom
      if (currentModel && modelSel.querySelector('option[value="' + currentModel.replace(/"/g, '\\"') + '"]')) {
        modelSel.value = currentModel;
      } else {
        modelSel.value = '__custom__';
        document.getElementById('settingsTextModel').value = currentModel;
      }
      syncModelCustomInput();

      statusEl.textContent = '(' + models.length + ' models)';
      statusEl.className = 'models-fetch-ok';
    } catch (e) {
      statusEl.textContent = '(could not load models)';
      statusEl.className = 'models-fetch-err';
    }
  }

  // --- Theme ---

  function applyTheme(hue) {
    document.documentElement.style.setProperty('--accent-h', String(hue));
    localStorage.setItem('storybound_accent_hue', String(hue));
    syncThemeSwatchActive(hue);
  }

  function syncThemeSwatchActive(hue) {
    document.querySelectorAll('.theme-swatch').forEach(function(btn) {
      btn.classList.toggle('theme-swatch-active', String(btn.dataset.hue) === String(hue));
    });
  }

  function loadSavedTheme() {
    var saved = localStorage.getItem('storybound_accent_hue');
    if (saved) document.documentElement.style.setProperty('--accent-h', saved);
    syncThemeSwatchActive(saved || '211');
  }

  function syncClearDataRow() {
    const isDemo = localStorage.getItem('storybound_demo_session') === '1';
    document.getElementById('settingsClearDataRow').style.display = isDemo ? '' : 'none';
  }

  function clearAllLocalData() {
    const msgEl = document.getElementById('settingsClearDataMsg');
    if (!confirm('This will delete all saved characters, settings, and game data from this browser. Continue?')) return;
    localStorage.clear();
    msgEl.textContent = 'All local data cleared.';
    msgEl.className = 'clear-data-ok';
    setTimeout(function() { location.reload(); }, 1500);
  }

  function syncMatureContentVisibility() {
    const sel = document.getElementById('settingsApiUrlSelect');
    const isXai = sel.value === 'https://api.x.ai/v1';
    const isCustom = sel.value === '__custom__';
    const show = isXai || isCustom;
    document.getElementById('settingsMatureContentRow').style.display = show ? '' : 'none';
    if (!show) {
      document.getElementById('settingsMatureContent').checked = false;
      document.getElementById('settingsMatureAgeGate').style.display = 'none';
      document.getElementById('settingsMatureAgeConfirm').checked = false;
    }
  }

  function syncAgeGate() {
    const matureChecked = document.getElementById('settingsMatureContent').checked;
    document.getElementById('settingsMatureAgeGate').style.display = matureChecked ? '' : 'none';
    if (!matureChecked) {
      document.getElementById('settingsMatureAgeConfirm').checked = false;
    }
  }

  function closeSettings() {
    document.getElementById('settingsOverlay').classList.remove('open');
    syncApiKeyGate();
  }

  function syncApiKeyGate() {
    const hasKey = !!(getSettings().apiKey || '').trim();
    const generateBtn = document.getElementById('generateNamesBtn');
    if (generateBtn) {
      generateBtn.disabled = !hasKey;
    }

    var notice = document.getElementById('apiKeyNotice');
    if (hasKey) {
      if (notice) notice.style.display = 'none';
      return;
    }

    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'apiKeyNotice';
      notice.innerHTML =
        '<div id="apiKeyNoticeIcon"><svg xmlns="http://www.w3.org/2000/svg" width="40px" height="40px" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg></div>' +
        '<div id="apiKeyNoticeTitle">API key required</div>' +
        '<p id="apiKeyNoticeBody">StoryboundAI sends requests directly from your browser to an AI provider. ' +
        'You\'ll need to supply your own API key to play.</p>' +
        '<p id="apiKeyNoticeProviders">Get a key from: ' +
        '<a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">OpenAI</a>, ' +
        '<a href="https://console.anthropic.com/account/keys" target="_blank" rel="noopener">Anthropic</a>, or ' +
        '<a href="https://console.x.ai/" target="_blank" rel="noopener">xAI</a>' +
        '</p>' +
        '<button id="apiKeyNoticeOpenSettings">Open Settings</button>';
      // Insert after the generate button
      const generateBtn2 = document.getElementById('generateNamesBtn');
      if (generateBtn2 && generateBtn2.parentNode) {
        generateBtn2.parentNode.insertBefore(notice, generateBtn2.nextSibling);
      } else {
        document.body.appendChild(notice);
      }
      document.getElementById('apiKeyNoticeOpenSettings').addEventListener('click', openSettings);
    }

    notice.style.display = '';
  }

  function saveSettingsFromModal() {
    const matureChecked = document.getElementById('settingsMatureContent').checked;
    const ageConfirmed = document.getElementById('settingsMatureAgeConfirm').checked;
    const s = {
      apiBaseUrl: getActiveUrl(),
      apiKey: document.getElementById('settingsApiKey').value.trim(),
      textModel: getActiveTextModel(),
      imageModel: document.getElementById('settingsImageModel').value.trim(),
      allowMatureContent: matureChecked && ageConfirmed
    };
    const ok = saveSettings(s);
    if (ok === false) {
      const resultEl = document.getElementById('settingsTestResult');
      resultEl.textContent = '✗ Could not save — browser storage may be full.';
      resultEl.className = 'err';
      return;
    }
    closeSettings();
  }

  function checkLocalhostWarning() {
    const url = getActiveUrl();
    const warn = document.getElementById('settingsLocalhostWarning');
    const isLocal = url.startsWith('http://localhost') || url.startsWith('http://127.');
    warn.style.display = isLocal ? 'block' : 'none';
  }

  async function runTestConnection() {
    const resultEl = document.getElementById('settingsTestResult');
    resultEl.textContent = 'Testing...';
    resultEl.className = '';
    const tempSettings = {
      apiBaseUrl: document.getElementById('settingsApiUrl').value.trim(),
      apiKey: document.getElementById('settingsApiKey').value.trim(),
      textModel: document.getElementById('settingsTextModel').value.trim(),
      imageModel: document.getElementById('settingsImageModel').value.trim(),
      allowMatureContent: document.getElementById('settingsMatureContent').checked
    };
    try {
      await testApiConnection(tempSettings);
      resultEl.textContent = '✓ Connection successful';
      resultEl.className = 'ok';
    } catch (e) {
      resultEl.textContent = '✗ ' + (e.message || 'Connection failed');
      resultEl.className = 'err';
    }
  }

  // --- Export ---
  async function exportData() {
    try {
      const payload = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('storybound_') && k !== 'storybound_settings') {
          try { payload[k] = JSON.parse(localStorage.getItem(k)); }
          catch (e) { payload[k] = localStorage.getItem(k); }
        }
      }
      // Include settings minus apiKey
      const s = getSettings();
      const settingsCopy = Object.assign({}, s);
      delete settingsCopy.apiKey;
      payload['storybound_settings'] = settingsCopy;

      // Compute integrity hash over payload with _integrity removed
      const payloadForHash = Object.assign({}, payload);
      delete payloadForHash._integrity;
      const sorted = sortedKeys(payloadForHash);
      const hashInput = JSON.stringify(sorted);
      const hashHex = await sha256Hex(hashInput);
      const exportObj = Object.assign({ _integrity: hashHex }, payload);

      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'storybound-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msgEl = document.getElementById('settingsImportMsg');
      if (msgEl) msgEl.textContent = 'Download failed: ' + (err.message || 'Unknown error');
    }
  }

  // --- Import ---
  async function importData(e) {
    const msgEl = document.getElementById('settingsImportMsg');
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const storedHash = parsed._integrity || '';
      const cleaned = Object.assign({}, parsed);
      delete cleaned._integrity;
      delete cleaned.apiKey;
      if (cleaned.storybound_settings) {
        delete cleaned.storybound_settings.apiKey;
      }
      const sorted = sortedKeys(cleaned);
      const recomputedHash = await sha256Hex(JSON.stringify(sorted));
      msgEl.className = 'import-success';
      // Write keys to localStorage (never apiKey)
      for (const k in cleaned) {
        if (k === 'apiKey') continue;
        if (!k.startsWith('storybound_')) continue;
        if (k === 'storybound_settings') {
          // Route through saveSettings so DEFAULT_SETTINGS merge is applied on next read.
          // Preserve the existing API key — it was stripped from the export intentionally.
          const existing = getSettings();
          const merged = Object.assign({}, cleaned[k], { apiKey: existing.apiKey });
          saveSettings(merged);
        } else {
          localStorage.setItem(k, JSON.stringify(cleaned[k]));
        }
      }
      let countdown = 4;
      function updateCountdown() {
        msgEl.textContent = (storedHash && recomputedHash !== storedHash
          ? 'File was modified — data loaded anyway.'
          : 'Import successful!') + ' Reloading in ' + countdown + '…';
        if (countdown <= 0) { location.reload(); return; }
        countdown--;
        setTimeout(updateCountdown, 1000);
      }
      updateCountdown();
    } catch (err) {
      msgEl.textContent = 'Import failed: ' + (err.message || 'Invalid file');
      msgEl.className = 'import-error';
    }
  }

  // --- Helpers ---
  function sortedKeys(obj) {
    const out = {};
    Object.keys(obj).sort().forEach(function(k) { out[k] = obj[k]; });
    return out;
  }

  async function sha256Hex(str) {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf)).map(function(b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  // --- Demo unlock ---

  async function runDemoUnlock() {
    const msgEl = document.getElementById('settingsDemoUnlockMsg');
    const passphrase = (document.getElementById('settingsDemoPassphrase').value || '').trim();
    if (!passphrase) { msgEl.textContent = 'Enter your unlock code.'; msgEl.className = 'demo-unlock-err'; return; }
    if (!DEMO_KEY_BLOB) { msgEl.textContent = 'No demo key configured.'; msgEl.className = 'demo-unlock-err'; return; }
    msgEl.textContent = 'Unlocking…'; msgEl.className = '';
    try {
      const apiKey = await decryptDemoKey(DEMO_KEY_BLOB, passphrase);
      document.getElementById('settingsApiKey').value = apiKey;
      document.getElementById('settingsDemoPassphrase').value = '';
      msgEl.textContent = '✓ API key loaded — save to apply.';
      msgEl.className = 'demo-unlock-ok';
      localStorage.setItem('storybound_demo_session', '1');
      syncClearDataRow();
      if (typeof enableImageGen === 'function') enableImageGen();
    } catch (e) {
      msgEl.textContent = '✗ Wrong code or corrupted blob.';
      msgEl.className = 'demo-unlock-err';
    }
  }

  // Decrypts a blob produced by tools/encrypt-key.html.
  // Blob format (base64): salt[16] | iv[12] | ciphertext
  async function decryptDemoKey(blob, passphrase) {
    const raw = Uint8Array.from(atob(blob), function(c) { return c.charCodeAt(0); });
    const salt = raw.slice(0, 16);
    const iv   = raw.slice(16, 28);
    const data = raw.slice(28);
    const enc  = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const aesKey  = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 200000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, aesKey, data);
    return new TextDecoder().decode(plainBuf);
  }

  // --- Init ---
  function init() {
    injectSettingsUI();
    loadSavedTheme();
    if (!hasSettings() || !(getSettings().apiKey || '').trim()) {
      openSettings();
    }
    syncApiKeyGate();
  }

  window.openSettings = openSettings;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
