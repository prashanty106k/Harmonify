import {icon} from './icons.mjs';

// The ChromaGrade landing page: a live port of the app's color-grading engine (WebGL 2) inside a
// replica of the editor. Everything on it is scoped: classes and IDs start with `cg-`, styles live in
// /assets/chromagrade.css and behavior in /assets/chromagrade*.js, loaded only on /chromagrade/.

const legalLink=(a,suffix,label,kind,sym,button)=>button(`/${a.slug}/${suffix}/`,label,kind,sym);

export function chromagradePage(a,{header,footer,download,button}){
  const privacyLabel=a.privacyPublished?'Privacy policy':'Privacy policy draft';
  const termsLabel=a.termsPublished?'Terms of service':'Terms of service draft';
  return `${header('apps')}<main class="cg">
  <div class="wrap breadcrumb"><a href="/">The studio</a><span>/</span><a href="/#apps">Our apps</a><span>/</span>${a.name}</div>
  <div class="wrap cg-stage">
    <section class="cg-intro" aria-labelledby="cg-intro-title">
      <div class="cg-app-label"><span class="app-icon ${a.type}">${icon(a.icon)}</span><span>${a.name}<small>${a.category}</small></span><span class="soon-badge">Coming soon</span></div>
      <p class="cg-eyebrow">Android video editor with a color studio</p>
      <h1 id="cg-intro-title">Grade every shot like a&nbsp;colorist.</h1>
      <p class="cg-lede">This is ChromaGrade's color engine running right here, on a flat, slightly off sample shot like the ones phones take. Fix the white balance, clear the haze, grade just the boat. The app does the same in its live preview and in 4K exports.</p>
      <div class="cg-cta">${download(a)}<span class="cg-cta-note"><span class="cg-dot" aria-hidden="true"></span>Runs in your browser. Nothing is uploaded.</span></div>
    </section>

    <section class="cg-device" aria-label="ChromaGrade editor">
      <div class="cg-phone" id="cg-phone">
        <div class="cg-screen" id="cg-app">
          <div class="cg-statusbar" aria-hidden="true">
            <span>9:41</span>
            <span class="cg-statusbar-icons">
              <svg viewBox="0 0 18 12"><path d="M1 11h2V8H1zM5 11h2V6H5zM9 11h2V4H9zM13 11h2V1h-2z"/></svg>
              <svg viewBox="0 0 16 12"><path d="M8 11.5 1 4.2a10 10 0 0 1 14 0z"/></svg>
              <svg viewBox="0 0 26 12"><rect x="1" y="1.5" width="21" height="9" rx="2.5" fill="none" stroke="currentColor"/><rect x="3" y="3.5" width="14" height="5" rx="1.2"/><rect x="23" y="4.5" width="1.6" height="3" rx=".8"/></svg>
            </span>
          </div>

          <header class="cg-topbar">
            <button class="cg-icon-btn" id="cg-btn-back" type="button" aria-label="Back to projects" data-icon="Back"></button>
            <div class="cg-topbar-title">
              <span class="cg-project-name" id="cg-project-name">Lakeside dusk</span>
              <span class="cg-project-status"><span class="cg-status-dot" aria-hidden="true"></span><span id="cg-project-status">Sample shot · nothing uploaded</span></span>
            </div>
            <button class="cg-icon-btn" id="cg-btn-undo" type="button" aria-label="Undo" data-icon="Undo" disabled></button>
            <button class="cg-icon-btn" id="cg-btn-redo" type="button" aria-label="Redo" data-icon="Redo" disabled></button>
            <button class="cg-export-btn" id="cg-btn-export" type="button" aria-label="Export"><span data-icon="Export"></span><span class="cg-label">Export</span></button>
          </header>

          <section class="cg-viewer" id="cg-viewer" aria-label="Viewer. Press and hold to see the original.">
            <canvas id="cg-gl" aria-hidden="true"></canvas>
            <canvas class="cg-guides" id="cg-guides" aria-hidden="true"></canvas>
            <div class="cg-split" id="cg-split" hidden>
              <span class="cg-split-tag cg-split-before">Before</span>
              <span class="cg-split-tag cg-split-after">After</span>
              <div class="cg-split-line" id="cg-split-line">
                <button class="cg-split-grip" id="cg-split-grip" type="button" aria-label="Before and after divider" role="slider" aria-valuemin="0" aria-valuemax="100"></button>
              </div>
            </div>
            <div class="cg-pick-marker" id="cg-pick-marker" hidden></div>
            <div class="cg-viewer-chips">
              <button class="cg-chip-dark" id="cg-chip-guides" type="button"><span data-icon="Guides"></span><span class="cg-chip-label">Guides</span></button>
              <button class="cg-chip-dark" id="cg-chip-scope" type="button"><span data-icon="Scope"></span><span class="cg-chip-label">Scope</span></button>
              <button class="cg-chip-dark" id="cg-chip-compare" type="button"><span data-icon="Compare"></span><span class="cg-chip-label">Graded</span></button>
            </div>
            <canvas class="cg-scope" id="cg-scope" hidden aria-hidden="true"></canvas>
            <div class="cg-hud" id="cg-hud"></div>
            <div class="cg-badge" id="cg-badge-original" hidden>ORIGINAL</div>
            <div class="cg-pick-banner" id="cg-pick-banner" hidden>
              <span data-icon="Eyedropper"></span>
              <span id="cg-pick-text">Tap something that should be white or grey</span>
              <button type="button" id="cg-pick-cancel">Cancel</button>
            </div>
            <div class="cg-viewer-loading" id="cg-loading">
              <div class="cg-loading-ring" aria-hidden="true"></div>
              <span id="cg-loading-text">Opening the sample shot…</span>
            </div>
          </section>

          <div class="cg-transport">
            <button class="cg-icon-btn cg-small" id="cg-btn-play" type="button" aria-label="Play" data-icon="Play" hidden></button>
            <span class="cg-transport-text" id="cg-transport-text">Sample shot · still</span>
            <span class="cg-transport-time" id="cg-transport-time"></span>
          </div>

          <section class="cg-panel" id="cg-panel" aria-label="Grade">
            <div class="cg-panel-head">
              <span class="cg-panel-title">Grade</span>
              <button class="cg-icon-btn" id="cg-btn-panel-done" type="button" aria-label="Close the grade panel" data-icon="Check"></button>
            </div>
            <div class="cg-panel-body" id="cg-panel-body"></div>
          </section>

          <section class="cg-timeline" id="cg-timeline" hidden aria-label="Timeline">
            <div class="cg-timeline-ruler" id="cg-timeline-ruler"></div>
            <div class="cg-timeline-tracks">
              <div class="cg-track cg-track-text"><span class="cg-layer-chip" data-icon-before="Text">Lakeside</span></div>
              <div class="cg-track cg-track-main"><canvas id="cg-filmstrip" class="cg-filmstrip"></canvas></div>
              <div class="cg-track cg-track-music"><canvas id="cg-waveform" class="cg-waveform"></canvas><span class="cg-music-name">Golden light.m4a</span></div>
              <div class="cg-playhead" aria-hidden="true"></div>
            </div>
            <p class="cg-timeline-note">This demo covers color. Trimming, layers, music and captions are in the app.</p>
          </section>
          <nav class="cg-toolrow" id="cg-toolrow" hidden aria-label="Tools"></nav>

          <div class="cg-sheet-scrim" id="cg-sheet-scrim" hidden></div>
          <section class="cg-sheet" id="cg-sheet" hidden aria-labelledby="cg-sheet-title" role="dialog" aria-modal="true">
            <div class="cg-sheet-grabber" aria-hidden="true"></div>
            <h2 id="cg-sheet-title">Export</h2>
            <ul class="cg-export-list">
              <li><span class="cg-export-kind">Video</span><span>MP4 with HEVC, H.264 or AV1, or WebM. Up to 4K and 60 fps.</span></li>
              <li><span class="cg-export-kind">GIF</span><span>Animated GIF for chats and the web.</span></li>
              <li><span class="cg-export-kind">Audio</span><span>The soundtrack alone, as M4A or WAV.</span></li>
              <li><span class="cg-export-kind">Still</span><span>The frame under the playhead as a PNG.</span></li>
            </ul>
            <p class="cg-sheet-note">Exports render on the phone and keep going in the background. This browser demo doesn't save files.</p>
            <button class="cg-sheet-close" id="cg-sheet-close" type="button">Close</button>
          </section>

          <div class="cg-toast" id="cg-toast" role="status" aria-live="polite"></div>
        </div>
      </div>
    </section>

    <section class="cg-tour" aria-labelledby="cg-tour-title">
      <div class="cg-tour-head">
        <h2 id="cg-tour-title">Six things to try</h2>
        <span class="cg-tour-progress" id="cg-tour-progress">0 of 6</span>
      </div>
      <ol class="cg-tour-list" id="cg-tour-list"></ol>
      <button class="cg-text-btn" id="cg-tour-reset" type="button">Start over with the original shot</button>
    </section>

    <section class="cg-own" aria-labelledby="cg-own-title">
      <h2 id="cg-own-title">Grade your own photo or video</h2>
      <label class="cg-drop" id="cg-drop" for="cg-file-input">
        <span class="cg-drop-icon" data-icon="Import"></span>
        <span class="cg-drop-text"><strong>Choose a file</strong> or drop it here</span>
        <span class="cg-drop-hint">JPEG, PNG, WebP, MP4 or WebM. It stays in this tab.</span>
      </label>
      <input type="file" class="cg-file-input" id="cg-file-input" accept="image/*,video/*">
      <button class="cg-text-btn" id="cg-btn-sample" type="button" hidden>Back to the sample shot</button>
    </section>
  </div>

  <section class="wrap cg-more" aria-labelledby="cg-more-title">
    <h2 id="cg-more-title">The rest of ChromaGrade</h2>
    <div class="cg-more-grid">
      <article><span class="cg-more-icon" data-icon="Layers"></span><h3>Multi-track timeline</h3><p>Overlays, picture-in-picture, 13 blend modes, adjustment layers, masks and keyframes.</p></article>
      <article><span class="cg-more-icon" data-icon="Templates"></span><h3>Templates and beat sync</h3><p>Pick your clips and they're cut to the music, transitioned and styled.</p></article>
      <article><span class="cg-more-icon" data-icon="Captions"></span><h3>Auto captions</h3><p>Speech becomes captions on the phone, with karaoke-style word highlighting.</p></article>
      <article><span class="cg-more-icon" data-icon="Cutout"></span><h3>Background removal</h3><p>Cut the subject out of a video, or grade it separately, with on-device AI.</p></article>
      <article><span class="cg-more-icon" data-icon="Speed"></span><h3>Speed, reverse, stabilize</h3><p>Speed curves up to 10× with natural-sounding pitch, reverse and stabilization.</p></article>
      <article><span class="cg-more-icon" data-icon="Export"></span><h3>Export up to 4K</h3><p>HEVC, H.264 or AV1 at 60 fps, plus GIF, audio-only and still frames.</p></article>
    </div>
    <p class="cg-privacy"><strong>Private by design.</strong> No account and no ads. Your videos, photos and projects stay on your phone.</p>
    <div class="cg-legal">
      <div><span class="cg-eyebrow">Built on transparency</span><h2>A closer look at your privacy.</h2><p>${a.privacyPublished?'Read the privacy policy for information about media access, permissions and your choices.':`Release details and policies will be finalized before ${a.name} launches.`}</p></div>
      <div class="cg-legal-actions">${legalLink(a,'privacy-policy',privacyLabel,'outline','shield',button)}${legalLink(a,'terms',termsLabel,'quiet','arrow',button)}</div>
    </div>
    <p class="cg-note">This page runs a port of the app's grading engine with WebGL. The sample shot was painted with a shader for this demo.</p>
  </section>

  <section class="closing-band wrap"><span class="eyebrow">PART OF SOMETHING BIGGER</span><h2>More sides to your everyday.</h2><a class="text-link" href="/#apps">Explore all NovaTech apps ${icon('arrow')}</a></section>
</main>${footer()}`;
}
