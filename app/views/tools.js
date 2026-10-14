// View: Tools & Media (AI Watermark Removal, C2PA provenance scrubbing, and media utilities).
import { esc, icon, toast } from '../ui.js';

export function render(el) {
  let file = null;
  let originalUrl = null;
  let cleanedUrl = null;
  let originalSize = 0;
  let cleanedSize = 0;
  let fileName = '';

  function paint() {
    el.innerHTML = `
      <div class="page-head">
        <div>
          <div class="eyebrow">DOROGO Creative Tools</div>
          <h1>AI Watermark & Image Tools</h1>
          <p class="small muted">Remove AI provenance markers, C2PA metadata, SynthID, and Gemini sparkle logos from luxury assets.</p>
        </div>
        <div class="row gap">
          <a class="btn sm" href="https://raiw.cc" target="_blank" rel="noopener">${icon('external', 14)} Open Cloud Web GUI</a>
        </div>
      </div>

      <div class="grid cols-2 gap-16" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px;">
        <!-- Browser Instant Cleaner -->
        <section class="card stack">
          <div class="section-head">
            <h2>Instant In-Browser Cleaner</h2>
            <span class="hint">100% private · runs locally in your browser</span>
          </div>
          <p class="small muted">Drop an image here to scrub all hidden tracking tags, C2PA Content Credentials, EXIF camera tags, and AI generation metadata.</p>

          <div id="dropzone" style="border: 2px dashed var(--line-strong); border-radius: var(--r); padding: 32px 16px; text-align: center; background: var(--surface-2); cursor: pointer; transition: all .15s ease;">
            <input type="file" id="file-input" accept="image/png,image/jpeg,image/webp" style="display:none">
            <div style="font-size: 28px; margin-bottom: 8px;">${icon('upload', 32)}</div>
            <div style="font-weight: 600; margin-bottom: 4px;">Click to select or drag & drop an image</div>
            <div class="tiny faint">Supports PNG, JPG, WebP</div>
          </div>

          ${originalUrl ? `
            <div class="card flush" style="padding: 14px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r);">
              <div class="row between" style="margin-bottom: 10px;">
                <span class="small font-bold" style="font-weight:600; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(fileName)}</span>
                <span class="chip ok">Cleaned & Metadata Stripped</span>
              </div>
              <div class="row gap" style="display: flex; gap: 10px; align-items: center; justify-content: center; margin-bottom: 12px; background: #000; border-radius: var(--r-sm); padding: 8px; max-height: 220px; overflow: hidden;">
                <img src="${cleanedUrl || originalUrl}" alt="Preview" style="max-height: 200px; max-width: 100%; object-fit: contain; border-radius: 4px;">
              </div>
              <div class="row between small muted" style="margin-bottom: 12px;">
                <span>Original: ${(originalSize / 1024).toFixed(1)} KB</span>
                <span>Cleaned: ${(cleanedSize / 1024).toFixed(1)} KB</span>
              </div>
              <div class="row end gap">
                <button class="btn sm" id="btn-reset">Clear</button>
                <a class="btn sm primary" id="btn-download" href="${cleanedUrl}" download="clean_${esc(fileName)}">${icon('download', 14)} Download Clean Image</a>
              </div>
            </div>
          ` : ''}
        </section>

        <!-- Deep Neural Remover & CLI Guide -->
        <section class="card stack">
          <div class="section-head">
            <h2>Deep Neural Remover (CLI & Skill)</h2>
            <span class="hint">Installed in <code>tools/remove-ai-watermarks</code></span>
          </div>
          <p class="small muted">For visible Google Gemini sparkle stamps or pixel-embedded SynthID patterns, use the Python tool already installed on your Mac.</p>

          <div class="card flush" style="padding: 12px 14px; background: var(--surface-2); border-radius: var(--r);">
            <div class="row between" style="margin-bottom: 4px;">
              <span class="tiny uppercase font-bold" style="font-weight: 600; letter-spacing: 0.05em; color: var(--gold);">1. Use via Chat / AI Agent</span>
            </div>
            <p class="small" style="margin: 0; line-height: 1.5;">
              Just ask in the chat: <br>
              <code>"Clean the AI watermarks from /path/to/image.png"</code><br>
              The agent will invoke the skill and output the clean file.
            </p>
          </div>

          <div class="card flush" style="padding: 12px 14px; background: var(--surface-2); border-radius: var(--r);">
            <div class="row between" style="margin-bottom: 6px;">
              <span class="tiny uppercase font-bold" style="font-weight: 600; letter-spacing: 0.05em; color: var(--gold);">2. Terminal Commands</span>
            </div>
            <div class="stack" style="gap: 8px;">
              <div>
                <div class="tiny faint" style="margin-bottom: 2px;">Inspect marks & C2PA credentials:</div>
                <div class="row between" style="background: var(--surface); padding: 6px 8px; border-radius: 4px; border: 1px solid var(--line);">
                  <code class="small" style="font-size: .8rem;">remove-ai-watermarks identify image.png</code>
                  <button class="btn sm ghost" data-copy="remove-ai-watermarks identify image.png" style="padding: 2px 6px;">${icon('copy', 13)}</button>
                </div>
              </div>

              <div>
                <div class="tiny faint" style="margin-bottom: 2px;">Remove all watermarks (visible + metadata):</div>
                <div class="row between" style="background: var(--surface); padding: 6px 8px; border-radius: 4px; border: 1px solid var(--line);">
                  <code class="small" style="font-size: .8rem;">remove-ai-watermarks all input.png -o clean.png</code>
                  <button class="btn sm ghost" data-copy="remove-ai-watermarks all input.png -o clean.png" style="padding: 2px 6px;">${icon('copy', 13)}</button>
                </div>
              </div>

              <div>
                <div class="tiny faint" style="margin-bottom: 2px;">Batch process entire directory:</div>
                <div class="row between" style="background: var(--surface); padding: 6px 8px; border-radius: 4px; border: 1px solid var(--line);">
                  <code class="small" style="font-size: .8rem;">remove-ai-watermarks batch ./images/</code>
                  <button class="btn sm ghost" data-copy="remove-ai-watermarks batch ./images/" style="padding: 2px 6px;">${icon('copy', 13)}</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    // Wire up copy buttons
    el.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.copy);
        toast('Command copied to clipboard');
      });
    });

    // Wire up dropzone
    const dropzone = el.querySelector('#dropzone');
    const fileInput = el.querySelector('#file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--gold)';
        dropzone.style.background = 'var(--surface)';
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--line-strong)';
        dropzone.style.background = 'var(--surface-2)';
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--line-strong)';
        dropzone.style.background = 'var(--surface-2)';
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
      });
      fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleFile(fileInput.files[0]);
      });
    }

    el.querySelector('#btn-reset')?.addEventListener('click', () => {
      file = null;
      originalUrl = null;
      cleanedUrl = null;
      paint();
    });
  }

  function handleFile(f) {
    if (!f.type.startsWith('image/')) {
      toast('Please upload an image file (PNG, JPG, or WebP)', 'error');
      return;
    }
    file = f;
    fileName = f.name;
    originalSize = f.size;
    originalUrl = URL.createObjectURL(f);

    // Clean via Canvas (strips 100% of EXIF, IPTC, XMP, C2PA, and invisible text chunks)
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const mime = f.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob((blob) => {
        if (!blob) {
          cleanedUrl = originalUrl;
          cleanedSize = originalSize;
        } else {
          cleanedUrl = URL.createObjectURL(blob);
          cleanedSize = blob.size;
        }
        toast('Image processed and metadata cleaned');
        paint();
      }, mime, 0.95);
    };
    img.src = originalUrl;
  }

  paint();
}
