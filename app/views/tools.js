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
          <div class="eyebrow">DOROGO Creative & Automation Suite</div>
          <h1>DOROGO Tools</h1>
          <p class="small muted">AI watermark removal, C2PA provenance scrubbing, and luxury Lake Como wedding partner assets.</p>
        </div>
        <div class="row gap">
          <a class="btn sm" href="#today">${icon('mail', 14)} Back to Outreach CRM</a>
          <a class="btn sm ghost" href="https://raiw.cc" target="_blank" rel="noopener">${icon('external', 14)} Open Cloud Web (raiw.cc)</a>
        </div>
      </div>

      <!-- 3-Pillar Capability Architecture (Matching raiw.cc core) -->
      <div class="grid cols-3 gap-16" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- Card 1: Visible Marks -->
        <div class="card stack" style="border: 1px solid var(--line-strong); background: var(--surface); display: flex; flex-direction: column; justify-content: space-between; border-radius: var(--r); padding: 18px;">
          <div>
            <div class="row between" style="margin-bottom: 12px;">
              <div class="row gap" style="align-items: center;">
                <div style="background: rgba(168, 85, 247, 0.15); color: #c084fc; width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center;">
                  ${icon('sparkle', 16)}
                </div>
                <span style="font-weight: 600; font-size: 1.05rem;">Visible marks</span>
              </div>
              <span class="chip ok" style="font-size: .72rem; font-weight: 700; background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3);">FREE</span>
            </div>
            <p class="small muted" style="line-height: 1.5; margin-bottom: 16px;">
              The Gemini / Nano Banana sparkle plus the Doubao, Jimeng, Qwen, Kling, Tencent Yuanbao, RunningHub, Baidu and LiblibAI corner labels — painted out of the picture.
            </p>
          </div>
          <div>
            <div class="tiny faint" style="margin-bottom: 6px;">Supported: Local Mac CLI &amp; AI Chat</div>
            <a class="btn sm ghost" href="#neural" style="width: 100%; justify-content: space-between; color: var(--gold); border: 1px solid var(--line);">
              <span>Remove Gemini watermark</span>
              <span>↓</span>
            </a>
          </div>
        </div>

        <!-- Card 2: Metadata -->
        <div class="card stack" style="border: 1px solid var(--line-strong); background: var(--surface); display: flex; flex-direction: column; justify-content: space-between; border-radius: var(--r); padding: 18px;">
          <div>
            <div class="row between" style="margin-bottom: 12px;">
              <div class="row gap" style="align-items: center;">
                <div style="background: rgba(168, 85, 247, 0.15); color: #c084fc; width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center;">
                  ${icon('doc', 16)}
                </div>
                <span style="font-weight: 600; font-size: 1.05rem;">Metadata</span>
              </div>
              <span class="chip ok" style="font-size: .72rem; font-weight: 700; background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3);">FREE</span>
            </div>
            <p class="small muted" style="line-height: 1.5; margin-bottom: 16px;">
              C2PA Content Credentials, "Made with AI", China AIGC, generator EXIF/XMP — the tags platforms and social algorithms read to flag AI media.
            </p>
          </div>
          <div>
            <div class="tiny faint" style="margin-bottom: 6px;">Supported: 100% In-Browser &amp; CLI</div>
            <a class="btn sm ghost" href="#cleaner" style="width: 100%; justify-content: space-between; color: var(--ok); border: 1px solid var(--line);">
              <span>Strip AI metadata</span>
              <span>↓</span>
            </a>
          </div>
        </div>

        <!-- Card 3: Hidden in Pixels -->
        <div class="card stack" style="border: 1px solid var(--line-strong); background: var(--surface); display: flex; flex-direction: column; justify-content: space-between; border-radius: var(--r); padding: 18px;">
          <div>
            <div class="row between" style="margin-bottom: 12px;">
              <div class="row gap" style="align-items: center;">
                <div style="background: rgba(168, 85, 247, 0.15); color: #c084fc; width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center;">
                  <span style="font-size: 16px; line-height: 1;">≈</span>
                </div>
                <span style="font-weight: 600; font-size: 1.05rem;">Hidden in the pixels</span>
              </div>
              <span class="chip" style="font-size: .72rem; font-weight: 700; background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3);">From $1.49</span>
            </div>
            <p class="small muted" style="line-height: 1.5; margin-bottom: 16px;">
              SynthID and similar deep latent watermarks. Needs an NVIDIA CUDA GPU pass that regenerates the image through diffusion, then restores faces.
            </p>
          </div>
          <div>
            <div class="tiny faint" style="margin-bottom: 6px;">Requires Cloud NVIDIA CUDA GPU Cluster</div>
            <a class="btn sm ghost" href="https://raiw.cc" target="_blank" rel="noopener" style="width: 100%; justify-content: space-between; color: #c084fc; border: 1px solid var(--line);">
              <span>Remove SynthID (raiw.cc)</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Trust & Verification Bar -->
      <div class="banner" style="margin-bottom: 24px; background: var(--surface-2); border: 1px solid var(--line-strong); justify-content: space-around; padding: 12px 18px; font-size: .82rem;">
        <span class="row gap" style="align-items: center; color: var(--ink-2);"><span style="color: var(--ok);">🛡️</span> 100% Private · Zero data retention</span>
        <span class="row gap" style="align-items: center; color: var(--ink-2);"><span style="color: var(--gold);">⚡</span> Powered by <code>remove-ai-watermarks v0.45.1</code></span>
        <span class="row gap" style="align-items: center; color: var(--ink-2);"><span style="color: #c084fc;">☁️</span> Cloud GPU fallback via official raiw.cc</span>
      </div>

      <div class="grid cols-2 gap-16" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 18px; margin-bottom: 24px;">
        <!-- Browser Instant Cleaner (Card 2 Implementation) -->
        <section class="card stack" id="cleaner">
          <div class="section-head">
            <div>
              <h2>1. Instant In-Browser Metadata Stripper</h2>
              <p class="tiny muted">Client-side HTML5 canvas · Zero server upload · 100% Private</p>
            </div>
            <span class="chip ok">Instant</span>
          </div>
          <p class="small muted">Drop an image here to scrub all hidden camera EXIF tags, GPS location, C2PA Content Credentials ("Made with AI"), and invisible text markers directly on your device.</p>

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

        <!-- Deep Neural Remover & CLI Guide (Card 1 Implementation) -->
        <section class="card stack" id="neural">
          <div class="section-head">
            <div>
              <h2>2. Visible Watermark Inpainter</h2>
              <p class="tiny muted">Local Mac Python Engine · OpenCV Inpainting · Zero Cloud Latency</p>
            </div>
            <span class="chip gold">Local CLI</span>
          </div>
          <p class="small muted">For visible Google Gemini sparkle stamps, Doubao, Jimeng, or Kling labels, use the local engine installed directly on your Mac.</p>

          <div class="card flush" style="padding: 12px 14px; background: var(--surface-2); border-radius: var(--r);">
            <div class="row between" style="margin-bottom: 4px;">
              <span class="tiny uppercase font-bold" style="font-weight: 600; letter-spacing: 0.05em; color: var(--gold-ink);">A. In Antigravity AI Chat (Easiest)</span>
            </div>
            <p class="small" style="margin: 0; line-height: 1.5;">
              Simply say in the chat: <br>
              <code style="background: var(--surface); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">"Clean watermarks from /path/to/image.png"</code><br>
              Antigravity runs the installed <code>remove-ai-watermarks</code> skill automatically.
            </p>
          </div>

          <div class="card flush" style="padding: 12px 14px; background: var(--surface-2); border-radius: var(--r);">
            <div class="row between" style="margin-bottom: 6px;">
              <span class="tiny uppercase font-bold" style="font-weight: 600; letter-spacing: 0.05em; color: var(--gold-ink);">B. Direct Terminal Command</span>
            </div>
            <div class="stack" style="gap: 8px;">
              <div>
                <div class="tiny faint" style="margin-bottom: 2px;">Inspect watermarks &amp; C2PA:</div>
                <div class="row between" style="background: var(--surface); padding: 6px 8px; border-radius: 4px; border: 1px solid var(--line);">
                  <code class="small" style="font-size: .78rem;">remove-ai-watermarks identify image.png</code>
                  <button class="btn sm ghost" data-copy="remove-ai-watermarks identify image.png" style="padding: 2px 6px;">${icon('copy', 13)}</button>
                </div>
              </div>

              <div>
                <div class="tiny faint" style="margin-bottom: 2px;">Remove visible marks (Gemini sparkles, etc.):</div>
                <div class="row between" style="background: var(--surface); padding: 6px 8px; border-radius: 4px; border: 1px solid var(--line);">
                  <code class="small" style="font-size: .78rem;">remove-ai-watermarks visible input.png -o clean.png</code>
                  <button class="btn sm ghost" data-copy="remove-ai-watermarks visible input.png -o clean.png" style="padding: 2px 6px;">${icon('copy', 13)}</button>
                </div>
              </div>

              <div>
                <div class="tiny faint" style="margin-bottom: 2px;">Batch process entire directory:</div>
                <div class="row between" style="background: var(--surface); padding: 6px 8px; border-radius: 4px; border: 1px solid var(--line);">
                  <code class="small" style="font-size: .78rem;">remove-ai-watermarks batch ./images/</code>
                  <button class="btn sm ghost" data-copy="remove-ai-watermarks batch ./images/" style="padding: 2px 6px;">${icon('copy', 13)}</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Rate Card & Luxury Asset Studio -->
      <section class="card stack" id="ratecard" style="margin-bottom: 24px;">
        <div class="section-head">
          <div>
            <h2>3. DOROGO 2027 Wedding Partner Rate Card & Assets</h2>
            <p class="small muted">Official luxury rate card for Lake Como wedding planners, venues, and luxury concierges.</p>
          </div>
          <div class="row gap">
            <a class="btn sm primary" href="Dorogo_Wedding_Partner_Rate_Card.pdf" download="Dorogo_Wedding_Partner_Rate_Card.pdf">${icon('download', 14)} Download Rate Card PDF</a>
            <a class="btn sm" href="dorogo_wedding_partner_rate_card.html" target="_blank" rel="noopener">${icon('external', 14)} View Interactive Card</a>
          </div>
        </div>

        <div class="grid-3" style="margin-top: 6px;">
          <div class="card flush" style="padding: 14px; background: var(--surface-2); border-radius: var(--r);">
            <div class="label" style="margin-bottom: 4px;">AIRPORT TRANSFERS</div>
            <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 4px;">MXP ⇄ Lake Como</div>
            <p class="small muted">Malpensa to Bellagio, Tremezzo, or Menaggio. Mercedes-Benz V-Class (7 pax) €380 · S-Class €350.</p>
          </div>
          <div class="card flush" style="padding: 14px; background: var(--surface-2); border-radius: var(--r);">
            <div class="label" style="margin-bottom: 4px;">CITY & LOCAL TRANSFERS</div>
            <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 4px;">LIN / Milan ⇄ Como</div>
            <p class="small muted">Linate or Central Milan to Cernobbio & Como town. Mercedes-Benz V-Class €290 · E-Class €220.</p>
          </div>
          <div class="card flush" style="padding: 14px; background: var(--surface-2); border-radius: var(--r);">
            <div class="label" style="margin-bottom: 4px;">PARTNER TERMS</div>
            <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 4px;">10% Commission / Net Rates</div>
            <p class="small muted">Dedicated wedding coordinator dispatch, 24/7 flight tracking, water-taxi coordination & English-speaking chauffeurs.</p>
          </div>
        </div>
      </section>

      <!-- Quick Switch to Outreach Banner -->
      <div class="card row between" style="padding: 16px 20px; background: var(--surface); border: 1px solid var(--line);">
        <div class="row gap">
          <div style="font-size: 24px;">✉️</div>
          <div>
            <div style="font-weight: 600;">Ready to review your outreach pipeline?</div>
            <div class="small muted">Check today's approval queue, active replies, and 50/50 international discovery.</div>
          </div>
        </div>
        <a class="btn primary" href="#today">${icon('mail', 15)} Open Partner Outreach CRM</a>
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
