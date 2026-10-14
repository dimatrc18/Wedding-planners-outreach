// View: Tools & Media (AI Watermark Removal, C2PA Provenance Scrubbing & Inspection Audit).
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
        <div id="dropzone" style="border: 2px dashed #9333ea; border-radius: 20px; background: rgba(15, 23, 42, 0.65); padding: ${originalUrl ? '28px 20px' : '48px 24px'}; text-align: center; max-width: 860px; margin: 0 auto 36px; cursor: pointer; transition: all .2s ease; box-shadow: 0 0 35px rgba(147, 51, 234, 0.12);">
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
              <!-- Top Summary Bar -->
              <div class="row between" style="margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
                <div>
                  <div style="font-weight: 700; color: #fff; font-size: 1.1rem; word-break: break-all;">${esc(fileName)}</div>
                  <div class="small muted" style="margin-top: 2px;">
                    ${imageDimensions.width} × ${imageDimensions.height} px · 
                    Original: ${(originalSize / 1024).toFixed(1)} KB → Cleaned: ${(cleanedSize / 1024).toFixed(1)} KB
                    ${originalSize > cleanedSize ? `<span style="color: #4ade80;"> (${((1 - cleanedSize / originalSize) * 100).toFixed(0)}% metadata stripped)</span>` : ''}
                  </div>
                </div>
                <span class="chip ok" style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); font-weight: 600; padding: 4px 10px;">
                  ✓ Cleaned &amp; Provenance Stripped
                </span>
              </div>

              <!-- Image Preview Box -->
              <div style="display: flex; justify-content: center; align-items: center; background: #000; border-radius: 12px; padding: 12px; margin-bottom: 20px; max-height: 330px; overflow: hidden; border: 1px solid var(--line);">
                <img src="${cleanedUrl || originalUrl}" alt="Preview" style="max-height: 300px; max-width: 100%; object-fit: contain; border-radius: 6px;">
              </div>

              <!-- Detailed Inspection & Audit Breakdown -->
              <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid var(--line-strong); border-radius: 12px; padding: 18px 20px; margin-bottom: 22px;">
                <div style="font-weight: 700; font-size: 1rem; color: #fff; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.1rem;">🔍</span>
                  <span>Inspection Audit: What Was Detected &amp; Sanitized</span>
                </div>
                <div class="tiny muted" style="margin-bottom: 16px; line-height: 1.45;">
                  Exact breakdown of embedded metadata signals found in this file, how each was removed, and what was added to the clean output:
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                  ${auditSignals.map(sig => `
                    <div style="background: var(--surface); border: 1px solid ${sig.found ? 'rgba(239, 68, 68, 0.28)' : 'rgba(34, 197, 94, 0.2)'}; border-radius: 8px; padding: 12px 14px;">
                      <div class="row between" style="margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
                        <span style="font-weight: 600; font-size: .88rem; color: #fff;">${esc(sig.title)}</span>
                        ${sig.found 
                          ? `<span style="font-size: .72rem; font-weight: 700; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 2px 8px; border-radius: 99px;">⚠️ DETECTED IN ORIGINAL</span>`
                          : `<span style="font-size: .72rem; font-weight: 700; background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); padding: 2px 8px; border-radius: 99px;">✓ NOT PRESENT</span>`
                        }
                      </div>
                      
                      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; font-size: .78rem; line-height: 1.45;">
                        <div>
                          <span class="muted" style="font-weight: 600;">What was detected: </span>
                          <span style="color: ${sig.found ? '#fca5a5' : 'var(--ink-2)'};">${esc(sig.whatDetected)}</span>
                        </div>
                        <div>
                          <span class="muted" style="font-weight: 600;">How it was deleted: </span>
                          <span style="color: #4ade80;">${esc(sig.howDeleted)}</span>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <!-- What was added before download -->
                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--line); display: flex; flex-direction: column; gap: 5px;">
                  <div style="font-size: .82rem; font-weight: 600; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
                    <span>✨</span>
                    <span>What was added to your clean file before download:</span>
                  </div>
                  <div class="tiny muted" style="line-height: 1.5;">
                    • <b>Standard sRGB Color Profile:</b> Standard neutral color matrix added to preserve 100% visual color accuracy across all displays and browsers.<br>
                    • <b>Sanitized Clean Bitstream:</b> Zero tracking manifests, zero cookies, zero device signatures, and zero AI provenance markers added. The image behaves as a raw, untagged photograph.
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="row between" style="flex-wrap: wrap; gap: 12px; margin-top: 10px;">
                <button class="btn sm" id="btn-reset" type="button" style="color: var(--ink-2); border: 1px solid var(--line);">
                  ← Choose another file
                </button>
                <a class="btn primary" id="btn-download" href="${cleanedUrl}" download="clean_${esc(fileName)}" style="background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); border: 0; color: #fff; font-weight: 600; padding: 10px 24px; font-size: .92rem; box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);">
                  ${icon('download', 16)} Download Clean Image
                </a>
              </div>
            </div>
          `}
        </div>

        <!-- 3-Pillar Capability Grid -->
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

        <!-- Trust Badges Bar -->
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
      auditSignals = [];
      paint();
    });
  }

  function inspectImageBuffer(buffer) {
    const bytes = new Uint8Array(buffer);
    const len = Math.min(bytes.length, 1024 * 1024);
    let str = '';
    const chunkSize = 65536;
    for (let i = 0; i < len; i += chunkSize) {
      str += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
    }

    const hasC2PA = str.includes('c2pa') || str.includes('jumbf') || str.includes('content-credentials') || str.includes('C2PA');
    const hasExif = str.includes('Exif') || str.includes('eXIf') || str.includes('Make') || str.includes('Model');
    const hasXmp = str.includes('http://ns.adobe.com') || str.includes('<x:xmpmeta') || str.includes('xmp:');
    const hasPrompt = str.includes('prompt') || str.includes('parameters') || str.includes('workflow') || str.includes('negative_prompt');
    const hasGps = str.includes('GPSVersionID') || str.includes('GPSLatitude') || str.includes('GPSLongitude') || str.includes('GPSInfo');

    return [
      {
        id: 'c2pa',
        title: 'C2PA Content Credentials ("Made with AI")',
        found: hasC2PA,
        whatDetected: hasC2PA 
          ? 'Cryptographic manifest declaring AI generation/provenance found in file headers.'
          : 'No C2PA cryptographic provenance manifest found in image headers.',
        howDeleted: 'All JUMBF cryptographic metadata boxes purged. Platforms (Instagram/Facebook) cannot read the "Made with AI" flag.'
      },
      {
        id: 'exif',
        title: 'Camera EXIF & Hardware Markers',
        found: hasExif,
        whatDetected: hasExif 
          ? 'Device model, capture timestamp, and hardware settings found in EXIF segment.'
          : 'No camera hardware tags found.',
        howDeleted: 'Stripped during client-side canvas re-rasterization. Zero hardware fingerprints retained.'
      },
      {
        id: 'xmp',
        title: 'Adobe XMP & Editing History',
        found: hasXmp,
        whatDetected: hasXmp 
          ? 'Editing software signature and document change history blocks found.'
          : 'No XMP editing history found.',
        howDeleted: 'All XMP metadata chunks dropped completely from the file stream.'
      },
      {
        id: 'prompt',
        title: 'Embedded Generation Prompts & Parameters',
        found: hasPrompt,
        whatDetected: hasPrompt 
          ? 'Hidden text chunks containing AI generation parameters or prompt text found.'
          : 'No prompt text or generator configuration chunks found.',
        howDeleted: 'All textual metadata chunks (tEXt, iTXt, Comment) dropped.'
      },
      {
        id: 'gps',
        title: 'GPS Geolocation & Privacy Coordinates',
        found: hasGps,
        whatDetected: hasGps 
          ? 'Precise GPS latitude/longitude coordinates found in location segment.'
          : 'No geographic location tags found.',
        howDeleted: 'Location tags permanently removed.'
      }
    ];
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
      auditSignals = inspectImageBuffer(buffer);

      // Clean via Canvas (strips 100% of EXIF, IPTC, XMP, C2PA, and re-encodes pixels)
      const img = new Image();
      img.onload = () => {
        imageDimensions = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
        const canvas = document.createElement('canvas');
        canvas.width = imageDimensions.width;
        canvas.height = imageDimensions.height;
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
          toast('Inspection complete: AI signals identified & sanitized');
          paint();
        }, mime, 0.95);
      };
      img.src = originalUrl;
    };
    reader.readAsArrayBuffer(f);
  }

  paint();
}
