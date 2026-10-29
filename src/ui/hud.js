export class HUD {
  constructor() {
    this.movesEl = document.getElementById('moves');
    this.bestEl = document.getElementById('best');
    this.hintEl = document.getElementById('hint');
    this.banner = document.getElementById('banner');
    this.bannerTitle = document.getElementById('banner-title');
    this.bannerText = document.getElementById('banner-text');
    this.btnReset = document.getElementById('btn-reset');
    this.btnRestart = document.getElementById('btn-restart');
    this.hintTimer = null;
  }

  bind(game) {
    this.btnReset.addEventListener('click', () => game.newGame());
    this.btnRestart.addEventListener('click', () => game.newGame());
    this.update(game);
  }

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
