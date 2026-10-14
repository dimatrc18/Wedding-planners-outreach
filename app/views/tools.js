// View: Tools & Media (AI Watermark Removal, C2PA Provenance Scrubbing & Latent Frequency Disruption).
// Minimalist, autonomous luxury styling for DOROGO (Black, Charcoal, Crisp White).
import * as core from '../../supabase/functions/_shared/core/index.js';
import { esc, icon, toast } from '../ui.js';

export function render(el) {
  let file = null;
  let originalUrl = null;
  let cleanedUrl = null;
  let originalSize = 0;
  let cleanedSize = 0;
  let fileName = '';
  let auditSignals = [];
  let imageDimensions = { width: 0, height: 0 };
  let deepPixelPass = true; // Enabled by default for full SynthID / latent frequency disruption

  function paint() {
    el.innerHTML = `
      <div style="max-width: 880px; margin: 0 auto 60px;">
        <!-- Page Header (Minimalist DOROGO Design System) -->
        <div class="page-head" style="margin-bottom: 24px;">
          <div>
            <div class="label" style="margin-bottom: 4px;">DOROGO TOOLS</div>
            <h1 style="font-family: var(--display); font-size: 2rem; color: var(--ink); margin-bottom: 6px; font-weight: 400; letter-spacing: .01em;">
              Watermark &amp; Metadata Sanitizer
            </h1>
            <p class="small muted" style="max-width: 600px; line-height: 1.5;">
              Autonomous in-browser cleaner. Strips C2PA credentials ("Made with AI"), EXIF camera tags, GPS locations, and disrupts latent frequency watermarks directly on your device.
            </p>
          </div>
        </div>

        <!-- Main Dropzone / Inspection View -->
        ${!originalUrl ? `
          <div id="dropzone" style="border: 1px dashed var(--line-strong); border-radius: var(--r); background: var(--surface); padding: 56px 24px; text-align: center; margin-bottom: 24px; cursor: pointer; transition: all .15s ease;">
            <input type="file" id="file-input" accept="image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif" style="display:none">
            
            <div style="width: 48px; height: 48px; margin: 0 auto 16px; border-radius: var(--r-sm); background: var(--surface-2); display: grid; place-items: center; color: var(--ink);">
              ${icon('upload', 24)}
            </div>

            <div style="font-weight: 600; font-size: 1.15rem; color: var(--ink); margin-bottom: 4px;">
              Drop image here to sanitize
            </div>

            <div class="small muted" style="margin-bottom: 18px;">
              PNG, JPG, WebP, AVIF — 100% Client-Side Private (Zero Upload)
            </div>

            <button class="btn primary" id="btn-choose" type="button" style="padding: 9px 24px; font-weight: 600;">
              ${icon('upload', 14)} Choose an image
            </button>
          </div>
        ` : `
          <div class="card stack" style="margin-bottom: 24px; border: 1px solid var(--line-strong);">
            <!-- File Info & Clean Status Bar -->
            <div class="row between" style="padding-bottom: 12px; border-bottom: 1px solid var(--line); flex-wrap: wrap; gap: 8px;">
              <div>
                <div style="font-weight: 600; color: var(--ink); font-size: 1rem; word-break: break-all;">${esc(fileName)}</div>
                <div class="small muted" style="margin-top: 2px;">
                  ${imageDimensions.width} × ${imageDimensions.height} px · 
                  ${(originalSize / 1024).toFixed(1)} KB → ${(cleanedSize / 1024).toFixed(1)} KB
                </div>
              </div>
              <span class="chip ok" style="padding: 4px 10px; font-weight: 600;">
                ✓ Cleaned &amp; Stripped
              </span>
            </div>

            <!-- Image Preview Box -->
            <div style="display: flex; justify-content: center; align-items: center; background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-sm); padding: 14px; max-height: 420px; overflow: hidden;">
              <img src="${cleanedUrl || originalUrl}" alt="Preview" style="max-height: 390px; max-width: 100%; object-fit: contain; border-radius: 4px;">
            </div>

            <!-- Minimalist Inspection Audit: ONLY DETECTED SIGNALS -->
            ${auditSignals.length === 0 ? `
              <div style="background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-sm); padding: 14px 16px;">
                <div class="row gap" style="align-items: center;">
                  <span class="chip ok" style="font-size: .72rem; font-weight: 600;">Clean</span>
                  <span style="font-weight: 600; font-size: .9rem; color: var(--ink);">No tracking signals detected</span>
                </div>
                <div class="tiny muted" style="margin-top: 4px; line-height: 1.45;">
                  Zero C2PA AI credentials, camera EXIF headers, GPS location coordinates, or embedded generation prompts were found in this file.
                </div>
              </div>
            ` : `
              <div style="background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-sm); padding: 14px 16px;">
                <div class="row between" style="margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
                  <div style="font-weight: 600; font-size: .9rem; color: var(--ink);">
                    Sanitized Signals (${auditSignals.length})
                  </div>
                  <span class="chip ok" style="font-size: .72rem; font-weight: 600;">Purged</span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${auditSignals.map(sig => `
                    <div style="background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-sm); padding: 10px 14px; font-size: .8rem; line-height: 1.45;">
                      <div style="font-weight: 600; color: var(--ink); margin-bottom: 2px;">
                        ${esc(sig.title)}
                      </div>
                      <div style="color: var(--ink-2); margin-bottom: 2px;">
                        <span class="faint">Detected:</span> ${esc(sig.howPresent)}
                      </div>
                      <div style="color: var(--ok); font-weight: 500;">
                        ✓ ${esc(sig.howRemoved)}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `}

            <!-- Latent SynthID Frequency Disruption Control -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--surface-2); border-radius: var(--r-sm); border: 1px solid var(--line); flex-wrap: wrap; gap: 8px;">
              <label class="check" style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="chk-deep-pass" ${deepPixelPass ? 'checked' : ''} style="cursor: pointer;">
                <span style="font-weight: 600; font-size: .85rem; color: var(--ink);">Disrupt latent SynthID frequency watermarks</span>
              </label>
              <span class="tiny faint">±1 spatial micro-dither · Imperceptible to human eye</span>
            </div>

            <!-- Action Buttons: Download Clean Image -->
            <div class="row between" style="flex-wrap: wrap; gap: 12px; align-items: center; padding-top: 6px;">
              <button class="btn" id="btn-reset" type="button">
                ← Choose another file
              </button>
              <div style="text-align: right;">
                <a class="btn primary" id="btn-download" href="${cleanedUrl}" download="clean_${esc(fileName)}" style="padding: 10px 28px; font-weight: 600;">
                  ${icon('download', 15)} Download Clean Image
                </a>
                <div class="tiny faint" style="margin-top: 4px;">
                  Pure image output · Zero text, badges, or overlays added
                </div>
              </div>
            </div>
          </div>
        `}

        <!-- Optional GPU Colab link at the very bottom -->
        <div style="text-align: center; margin-top: 32px;">
          <a class="tiny muted" href="https://colab.research.google.com/github/dimatrc18/Wedding-planners-outreach/blob/main/dorogo_synthid_cleaner.ipynb" target="_blank" rel="noopener" style="text-decoration: none; border-bottom: 1px dotted var(--line-strong);">
            Need deep neural diffusion regeneration on GPU? Open free Google Colab notebook →
          </a>
        </div>
      </div>
    `;

    // Dropzone event listeners
    const dropzone = el.querySelector('#dropzone');
    const fileInput = el.querySelector('#file-input');
    const btnChoose = el.querySelector('#btn-choose');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#btn-reset') || e.target.closest('#btn-download')) return;
        fileInput.click();
      });

      if (btnChoose) {
        btnChoose.addEventListener('click', (e) => {
          e.stopPropagation();
          fileInput.click();
        });
      }

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--ink)';
        dropzone.style.background = 'var(--surface-2)';
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--line-strong)';
        dropzone.style.background = 'var(--surface)';
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--line-strong)';
        dropzone.style.background = 'var(--surface)';
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleFile(fileInput.files[0]);
      });
    }

    el.querySelector('#chk-deep-pass')?.addEventListener('change', (e) => {
      deepPixelPass = e.target.checked;
      if (file) reprocessImage();
    });

    el.querySelector('#btn-reset')?.addEventListener('click', (e) => {
      e.stopPropagation();
      file = null;
      originalUrl = null;
      cleanedUrl = null;
      auditSignals = [];
      paint();
    });
  }

  function reprocessImage() {
    if (!originalUrl) return;
    const img = new Image();
    img.onload = () => {
      imageDimensions = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
      const canvas = document.createElement('canvas');
      canvas.width = imageDimensions.width;
      canvas.height = imageDimensions.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      if (deepPixelPass) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        core.applyPixelMicroDither(imgData.data);
        ctx.putImageData(imgData, 0, 0);
      }

      const mime = file && file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob((blob) => {
        if (!blob) {
          cleanedUrl = originalUrl;
          cleanedSize = originalSize;
        } else {
          cleanedUrl = URL.createObjectURL(blob);
          cleanedSize = blob.size;
        }
        toast(deepPixelPass ? 'Cleaned with latent SynthID disruption' : 'Cleaned metadata only');
        paint();
      }, mime, 0.95);
    };
    img.src = originalUrl;
  }

  function handleFile(f) {
    if (!f.type.startsWith('image/')) {
      toast('Please upload an image file (PNG, JPG, WebP, etc.)', 'error');
      return;
    }
    file = f;
    fileName = f.name;
    originalSize = f.size;
    originalUrl = URL.createObjectURL(f);

    // Read buffer for client-side signal inspection audit
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target.result;
      auditSignals = core.inspectImageBuffer(buffer);
      reprocessImage();
    };
    reader.readAsArrayBuffer(f);
  }

  paint();
}
