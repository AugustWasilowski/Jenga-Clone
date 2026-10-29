export class HUD {
  constructor() {
    this.movesEl = document.getElementById('moves');
    this.bestEl = document.getElementById('best');
    this.hintEl = document.getElementById('hint');
    this.banner = document.getElementById('banner');
    this.bannerTitle = document.getElementById('banner-title');
    this.bannerText = document.getElementById('banner-text');
    this.btnReset = document.getElementById('btn-reset');
    this.modeButtons = Array.from(document.querySelectorAll('#modes button'));
    this.btnRestart = document.getElementById('btn-restart');
    this.hintTimer = null;
  }

  bind(game, { switchMode } = {}) {
    this.btnReset.addEventListener('click', () => game.newGame());
    if (switchMode) for (const b of this.modeButtons) b.addEventListener('click', () => switchMode(b.dataset.mode));
    this.btnRestart.addEventListener('click', () => game.newGame());
    this.update(game);
  }

  setMode(key) { for (const b of this.modeButtons) b.classList.toggle('active', b.dataset.mode === key); }

  update(game) {
    this.movesEl.textContent = String(game.moves);
    this.bestEl.textContent = String(game.best);
  }

  hint(text, fade = false) {
    clearTimeout(this.hintTimer);
    if (!text) { this.hintEl.classList.add('hidden'); return; }
    this.hintEl.textContent = text;
    this.hintEl.classList.remove('hidden');
    if (fade) this.hintTimer = setTimeout(() => this.hintEl.classList.add('hidden'), 2500);
  }

  showBanner(title, text) {
    this.bannerTitle.textContent = title;
    this.bannerText.textContent = text;
    this.banner.classList.add('show');
  }

  hideBanner() { this.banner.classList.remove('show'); }
}
