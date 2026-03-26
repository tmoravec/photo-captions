// ────────────────────────────────────────────────────────────
// Photo Captions — vanilla JS frontend
// ────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────────────────────
  const authOverlay   = document.getElementById('auth-overlay');
  const passwordInput = document.getElementById('password-input');
  const authSubmit    = document.getElementById('auth-submit');
  const authError     = document.getElementById('auth-error');

  const platformSel  = document.getElementById('platform');
  const contextArea  = document.getElementById('context');
  const dropZone     = document.getElementById('drop-zone');
  const fileInput    = document.getElementById('file-input');
  const fileList     = document.getElementById('file-list');
  const submitBtn    = document.getElementById('submit-btn');
  const resultsArea  = document.getElementById('results');

  // ── State ───────────────────────────────────────────────────
  let selectedFiles = []; // Array<File>

  // ── Auth ────────────────────────────────────────────────────
  const SESSION_KEY = 'photo_captions_pw';

  function getPassword() {
    return sessionStorage.getItem(SESSION_KEY) || '';
  }

  function savePassword(pw) {
    sessionStorage.setItem(SESSION_KEY, pw);
  }

  function clearPassword() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function showAuthOverlay() {
    authOverlay.classList.remove('d-none');
    passwordInput.value = '';
    authError.classList.add('d-none');
    passwordInput.focus();
  }

  function hideAuthOverlay() {
    authOverlay.classList.add('d-none');
  }

  // On page load: if a saved password exists, hide the overlay
  if (getPassword()) {
    hideAuthOverlay();
  } else {
    showAuthOverlay();
  }

  authSubmit.addEventListener('click', () => {
    const pw = passwordInput.value.trim();
    if (!pw) return;
    // We won't verify here — the first real API call will confirm.
    savePassword(pw);
    hideAuthOverlay();
  });

  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') authSubmit.click();
  });

  // ── File management ─────────────────────────────────────────
  function addFiles(files) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      // Avoid duplicates by name+size
      const duplicate = selectedFiles.some(
        (f) => f.name === file.name && f.size === file.size
      );
      if (!duplicate) {
        selectedFiles.push(file);
      }
    }
    renderFileList();
  }

  function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
  }

  function renderFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file, i) => {
      const li = document.createElement('li');
      li.className = 'file-row';

      const thumb = document.createElement('img');
      thumb.src = URL.createObjectURL(file);
      thumb.alt = file.name;
      thumb.className = 'thumb';

      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.875rem;';
      nameSpan.textContent = file.name;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.style.cssText = 'background:none;border:none;color:var(--text-muted);font-size:1.1rem;line-height:1;padding:0.2rem 0.4rem;cursor:pointer;border-radius:4px;flex-shrink:0;';
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', `Remove ${file.name}`);
      removeBtn.addEventListener('mouseover', () => removeBtn.style.color = '#dc2626');
      removeBtn.addEventListener('mouseout',  () => removeBtn.style.color = 'var(--text-muted)');
      removeBtn.addEventListener('click', () => removeFile(i));

      li.append(thumb, nameSpan, removeBtn);
      fileList.appendChild(li);
    });

    submitBtn.disabled = selectedFiles.length === 0;
  }

  // ── Drag & drop ─────────────────────────────────────────────
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    addFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });

  // Click on drop zone opens file browser (unless clicking the label directly)
  dropZone.addEventListener('click', (e) => {
    if (e.target.tagName === 'LABEL' || e.target.tagName === 'INPUT') return;
    fileInput.click();
  });

  // ── Utilities ───────────────────────────────────────────────
  function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for dimension extraction'));
      };
      img.src = url;
    });
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // result is "data:<mime>;base64,<data>" — strip the prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
    } else {
      legacyCopy(text);
    }
  }

  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }

  // ── Result card builders ────────────────────────────────────
  function createLoadingCard(file) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-filename">${escapeHtml(file.name)}</div>
      <div class="d-flex align-items-center gap-2" style="color:var(--text-muted)">
        <div class="spinner-border spinner-border-sm" role="status" aria-label="Loading"></div>
        <span style="font-size:0.9rem">Generating…</span>
      </div>`;
    return card;
  }

  function populateCard(card, result) {
    const filenameHtml = `<div class="result-filename">${escapeHtml(result.filename)}</div>`;

    if (!result.success) {
      card.innerHTML = `
        ${filenameHtml}
        <div class="alert alert-danger mb-0 py-2 small">${escapeHtml(result.error || 'Unknown error')}</div>`;
      return;
    }

    if (result.platform === 'reddit') {
      let rows = '';
      for (const { subreddit, caption } of result.subreddits) {
        rows += `
          <div class="reddit-row">
            <span class="subreddit-badge">r/${escapeHtml(subreddit)}</span>
            <span class="reddit-caption">${escapeHtml(caption)}</span>
          </div>`;
      }

      const allText = result.subreddits
        .map(({ subreddit, caption }) => `r/${subreddit}\n${caption}`)
        .join('\n\n');

      card.innerHTML = `
        ${filenameHtml}
        ${rows}
        <button class="btn btn-sm btn-outline-secondary copy-all-btn">Copy all</button>`;
      card.querySelector('.copy-all-btn').addEventListener('click', () => copyToClipboard(allText));
    } else {
      // flickr / instagram
      const isInstagram = result.platform === 'instagram';
      const tagsHtml = (result.tags || [])
        .map(
          (tag) =>
            `<span class="tag-chip" title="Click to copy">${isInstagram ? '#' : ''}${escapeHtml(tag)}</span>`
        )
        .join('');

      // Instagram: display caption with the dot-separator lines visible
      const captionDisplay = isInstagram
        ? `${escapeHtml(result.caption)}<br>.<br>.<br>.<br>`
        : escapeHtml(result.caption);

      card.innerHTML = `
        ${filenameHtml}
        <p class="result-caption">${captionDisplay}</p>
        <div class="mb-1">${tagsHtml}</div>
        <button class="btn btn-sm btn-outline-secondary copy-all-btn">Copy all</button>`;

      // Copy individual tag on click
      card.querySelectorAll('.tag-chip').forEach((chip, i) => {
        chip.addEventListener('click', () => copyToClipboard(`#${result.tags[i]}` || ''));
      });

      card.querySelector('.copy-all-btn').addEventListener('click', () => copyToClipboard(result.exportText || ''));
    }
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Submission ──────────────────────────────────────────────
  submitBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    const platform = platformSel.value;
    const context  = contextArea.value.trim();
    const password = getPassword();

    if (!password) {
      showAuthOverlay();
      return;
    }

    // Disable controls while running
    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating…';

    // Clear previous results
    resultsArea.innerHTML = '';

    // Create all placeholder cards up front
    const cards = selectedFiles.map((file) => {
      const card = createLoadingCard(file);
      resultsArea.appendChild(card);
      return card;
    });

    // Process images sequentially
    for (let i = 0; i < selectedFiles.length; i++) {
      const file  = selectedFiles[i];
      const card  = cards[i];

      try {
        const [imageBase64, dimensions] = await Promise.all([
          readFileAsBase64(file),
          getImageDimensions(file),
        ]);

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': password,
          },
          body: JSON.stringify({
            platform,
            context,
            filename: file.name,
            imageBase64,
            mimeType: file.type || 'image/jpeg',
            imageWidth: dimensions.width,
            imageHeight: dimensions.height,
          }),
        });

        if (response.status === 401) {
          clearPassword();
          populateCard(card, { success: false, filename: file.name, error: 'Authentication failed. Reload the page and enter your password.' });
          showAuthOverlay();
          break;
        }

        const result = await response.json();
        result.filename = result.filename || file.name;
        populateCard(card, result);
      } catch (err) {
        populateCard(card, { success: false, filename: file.name, error: `Request failed: ${err.message}` });
      }
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Generate captions';
  });
})();
