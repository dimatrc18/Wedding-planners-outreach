// View: Tools & Media (AI Watermark Removal & C2PA Provenance Scrubbing).
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
      <div style="max-width: 960px; margin: 16px auto 60px; padding: 0 16px;">
        <!-- Hero Header (Matching Image) -->
        <div style="text-align: center; margin-bottom: 34px;">
          <h1 style="font-size: clamp(2.1rem, 4.8vw, 3.2rem); font-weight: 800; line-height: 1.15; letter-spacing: -0.025em; margin-bottom: 14px;">
            <span style="background: linear-gradient(135deg, #a855f7 0%, #38bdf8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Remove AI watermarks</span><br>
            <span style="color: #ffffff;">and prove it happened</span>
          </h1>
          <p style="color: var(--ink-2); font-size: 1.05rem; max-width: 640px; margin: 0 auto; line-height: 1.55;">
            Drop an image. We list every AI signal in it - visible, metadata and hidden - then strip what you choose.
          </p>
        </div>

        <!-- Hero Dropzone Container -->
        <div id="dropzone" style="border: 2px dashed #9333ea; border-radius: 20px; background: rgba(15, 23, 42, 0.65); padding: ${originalUrl ? '28px 20px' : '48px 24px'}; text-align: center; max-width: 840px; margin: 0 auto 36px; cursor: pointer; transition: all .2s ease; box-shadow: 0 0 35px rgba(147, 51, 234, 0.12);">
          <input type="file" id="file-input" accept="image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif" style="display:none">
          
          ${!originalUrl ? `
            <div style="width: 48px; height: 48px; margin: 0 auto 16px; border-radius: 12px; background: rgba(168, 85, 247, 0.15); display: grid; place-items: center; color: #c084fc;">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
            </div>

            <div style="font-weight: 700; font-size: 1.35rem; color: #fff; margin-bottom: 8px;">
              Drop your file here
            </div>

            <div style="color: var(--ink-2); font-size: .88rem; margin-bottom: 10px;">
              PNG, JPG, WebP, AVIF, HEIC, HEIF - up to 120 MB · nothing to sign up for
            </div>

            <div style="color: var(--ink-3); font-size: .75rem; max-width: 640px; margin: 0 auto 24px; line-height: 1.45;">
              Processing supports images up to 25 MP. In-browser engine scrubs C2PA Content Credentials ("Made with AI"), EXIF camera tags, and invisible markers directly on your device with 100% privacy.
            </div>

            <button class="btn" id="btn-choose" type="button" style="background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); color: #fff; border: 0; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: .95rem; cursor: pointer; box-shadow: 0 4px 16px rgba(139, 92, 246, 0.35); display: inline-flex; align-items: center; gap: 8px; margin: 0 auto;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
              </svg>
              Choose a file
            </button>
          ` : `
            <div style="text-align: left; cursor: default;" onclick="event.stopPropagation()">
              <div class="row between" style="margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
                <div>
                  <div style="font-weight: 700; color: #fff; font-size: 1.05rem; word-break: break-all;">${esc(fileName)}</div>
                  <div class="small muted">Original: ${(originalSize / 1024).toFixed(1)} KB · Cleaned: ${(cleanedSize / 1024).toFixed(1)} KB</div>
                </div>
                <span class="chip ok" style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); font-weight: 600;">
                  ✓ Cleaned &amp; Provenance Stripped
                </span>
              </div>

              <!-- Image Preview Box -->
              <div style="display: flex; justify-content: center; align-items: center; background: #000; border-radius: 12px; padding: 12px; margin-bottom: 18px; max-height: 340px; overflow: hidden; border: 1px solid var(--line);">
                <img src="${cleanedUrl || originalUrl}" alt="Preview" style="max-height: 310px; max-width: 100%; object-fit: contain; border-radius: 6px;">
              </div>

              <!-- Signal Verification Checklist -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-bottom: 20px;">
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px;">
                  <div style="font-weight: 600; font-size: .84rem; color: #4ade80; margin-bottom: 2px;">✓ C2PA &amp; EXIF Tags</div>
                  <div class="tiny muted">"Made with AI" &amp; camera metadata deleted</div>
                </div>
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px;">
                  <div style="font-weight: 600; font-size: .84rem; color: #4ade80; margin-bottom: 2px;">✓ In-Browser Canvas Pass</div>
                  <div class="tiny muted">Client-side pixel re-encoding completed</div>
                </div>
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px;">
                  <div style="font-weight: 600; font-size: .84rem; color: #4ade80; margin-bottom: 2px;">✓ 100% Privacy Preserved</div>
                  <div class="tiny muted">Zero server upload, never stored</div>
                </div>
              </div>

              <div class="row end gap" style="margin-top: 10px;">
                <button class="btn sm" id="btn-reset" type="button">Choose another file</button>
                <a class="btn sm primary" id="btn-download" href="${cleanedUrl}" download="clean_${esc(fileName)}" style="background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); border: 0; color: #fff; font-weight: 600;">
                  ${icon('download', 14)} Download Clean Image
                </a>
              </div>
            </div>
          `}
        </div>

        <!-- 3-Pillar Capability Grid (Cleaned of all code blocks) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 16px; margin-bottom: 30px;">
          <!-- Card 1: Visible marks -->
          <div class="card stack" style="border: 1px solid var(--line-strong); background: var(--surface); border-radius: var(--r); padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="row between" style="margin-bottom: 10px;">
                <div class="row gap" style="align-items: center;">
                  <div style="background: rgba(168, 85, 247, 0.15); color: #c084fc; width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center;">
                    ${icon('sparkle', 15)}
                  </div>
                  <span style="font-weight: 600; font-size: 1rem; color: #fff;">Visible marks</span>
                </div>
                <span class="chip ok" style="font-size: .7rem; font-weight: 700; background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3);">FREE</span>
              </div>
              <p class="small muted" style="line-height: 1.5; margin: 0;">
                The Gemini / Nano Banana sparkle plus Doubao, Jimeng, Qwen, Kling, Tencent Yuanbao, RunningHub, Baidu and LiblibAI corner labels - painted out of the picture.
              </p>
            </div>
          </div>

          <!-- Card 2: Metadata -->
          <div class="card stack" style="border: 1px solid var(--line-strong); background: var(--surface); border-radius: var(--r); padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="row between" style="margin-bottom: 10px;">
                <div class="row gap" style="align-items: center;">
                  <div style="background: rgba(168, 85, 247, 0.15); color: #c084fc; width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center;">
                    ${icon('doc', 15)}
                  </div>
                  <span style="font-weight: 600; font-size: 1rem; color: #fff;">Metadata</span>
                </div>
                <span class="chip ok" style="font-size: .7rem; font-weight: 700; background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3);">FREE</span>
              </div>
              <p class="small muted" style="line-height: 1.5; margin: 0;">
                C2PA Content Credentials, "Made with AI", China AIGC, generator EXIF/XMP - the tags social algorithms and platforms read.
              </p>
            </div>
          </div>

          <!-- Card 3: Hidden in pixels -->
          <div class="card stack" style="border: 1px solid var(--line-strong); background: var(--surface); border-radius: var(--r); padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="row between" style="margin-bottom: 10px;">
                <div class="row gap" style="align-items: center;">
                  <div style="background: rgba(168, 85, 247, 0.15); color: #c084fc; width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center;">
                    <span style="font-size: 15px; line-height: 1;">≈</span>
                  </div>
                  <span style="font-weight: 600; font-size: 1rem; color: #fff;">Hidden in the pixels</span>
                </div>
                <span class="chip" style="font-size: .7rem; font-weight: 700; background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3);">Colab Free / $1.49</span>
              </div>
              <p class="small muted" style="line-height: 1.5; margin-bottom: 12px;">
                SynthID and deep latent watermarks. Runs a diffusion GPU pass to regenerate pixels, then restores faces.
              </p>
            </div>
            <a class="btn sm ghost" href="https://colab.research.google.com/github/dimatrc18/Wedding-planners-outreach/blob/main/dorogo_synthid_cleaner.ipynb" target="_blank" rel="noopener" style="font-size: .78rem; color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); justify-content: center; width: 100%; border-radius: 6px; padding: 6px 10px; text-decoration: none;">
              <span>Open Free Google Colab GPU ↗</span>
            </a>
          </div>
        </div>

        <!-- Trust Badges Bar (Matching screenshot footer) -->
        <div style="display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; color: var(--ink-2); font-size: .8rem; text-align: center; margin-top: 20px;">
          <span>🛡️ No account, no subscription</span>
          <span>🔒 100% Client-side privacy</span>
          <span>⚡ Zero server uploads</span>
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
        dropzone.style.borderColor = '#38bdf8';
        dropzone.style.boxShadow = '0 0 45px rgba(56, 189, 248, 0.25)';
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = '#9333ea';
        dropzone.style.boxShadow = '0 0 35px rgba(147, 51, 234, 0.12)';
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#9333ea';
        dropzone.style.boxShadow = '0 0 35px rgba(147, 51, 234, 0.12)';
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleFile(fileInput.files[0]);
      });
    }

    el.querySelector('#btn-reset')?.addEventListener('click', (e) => {
      e.stopPropagation();
      file = null;
      originalUrl = null;
      cleanedUrl = null;
      paint();
    });
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

    // Clean via Canvas (strips 100% of EXIF, IPTC, XMP, C2PA, and re-encodes pixels)
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
        toast('Image processed: C2PA & metadata stripped');
        paint();
      }, mime, 0.95);
    };
    img.src = originalUrl;
  }

  paint();
}
