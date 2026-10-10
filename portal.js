// Thin wrapper over the CrazyGames / Poki SDKs so a game calls one API everywhere.
// build-portal.sh sets window.PORTAL and adds the SDK <script>; on our own site every call is a no-op.
(() => {
  const name = window.PORTAL || 'web';
  const cg = () => window.CrazyGames && window.CrazyGames.SDK;
  let ready = Promise.resolve();
  let playing = false;

  if (name === 'crazygames' && cg()) ready = cg().init().catch(() => {});
  if (name === 'poki' && window.PokiSDK) ready = PokiSDK.init().catch(() => {});

  const safe = (fn) => { try { fn(); } catch (e) { console.warn('[portal]', e); } };
  const cgOn = () => name === 'crazygames' && cg() && cg().environment !== 'disabled';

  if (name !== 'web') document.documentElement.classList.add('portal');

  window.Portal = {
    name,
    isWeb: name === 'web',
    ready,
    loaded() {
      ready.then(() => safe(() => {
        if (name === 'poki') PokiSDK.gameLoadingFinished();
      }));
    },
    start() {
      if (playing) return; playing = true;
      ready.then(() => safe(() => {
        if (cgOn()) cg().game.gameplayStart();
        if (name === 'poki') PokiSDK.gameplayStart();
      }));
    },
    stop() {
      if (!playing) return; playing = false;
      ready.then(() => safe(() => {
        if (cgOn()) cg().game.gameplayStop();
        if (name === 'poki') PokiSDK.gameplayStop();
      }));
    },
    happy() { ready.then(() => safe(() => { if (cgOn()) cg().game.happytime(); })); },
    // Interstitial between levels. onPause/onResume let the game mute audio; always resolves.
    break(onPause, onResume) {
      return ready.then(() => new Promise((done) => {
        const finish = () => { onResume && onResume(); done(); };
        try {
          if (cgOn()) {
            cg().ad.requestAd('midgame', { adStarted: () => onPause && onPause(), adFinished: finish, adError: finish });
          } else if (name === 'poki') {
            PokiSDK.commercialBreak(() => onPause && onPause()).then(finish, finish);
          } else finish();
        } catch { finish(); }
      }));
    },
    // Progress save: CrazyGames Data Module when available (it syncs across devices), else localStorage.
    // Read only after Portal.ready, because the SDK preloads the player's data during init.
    storage: {
      get(key) {
        try { if (cgOn() && cg().data) return cg().data.getItem(key); } catch (e) { console.warn('[portal]', e); }
        try { return localStorage.getItem(key); } catch { return null; }
      },
      set(key, value) {
        try { if (cgOn() && cg().data) { cg().data.setItem(key, value); return; } } catch (e) { console.warn('[portal]', e); }
        try { localStorage.setItem(key, value); } catch {}
      },
    },
    // The portal can mute the game (its own sound button); fn(muted) runs now and on every change.
    onMute(fn) {
      ready.then(() => safe(() => {
        if (!cgOn()) return;
        const g = cg().game;
        fn(!!(g.settings && g.settings.muteAudio));
        g.addSettingsChangeListener((s) => fn(!!s.muteAudio));
      }));
    },
  };
})();
