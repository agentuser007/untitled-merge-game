// ============================================================
// main.ts — Vue App Entry Point
// ============================================================
// Creates the Vue app with Pinia, imports global styles,
// and sets up global event handlers (touch prevention, zoom
// prevention, visibility change, dev mode).
// ============================================================

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// Import global styles (order matters: variables first)
import './styles/variables.css'
import './styles/global.css'
import './styles/animations.css'
import './styles/fonts.css'
import './styles/dev-panel.css'

const appEl = document.getElementById('app')
if (appEl && !(appEl as any).__vue_app__) { // SAFE-CAST: Vue内部属性，仅启动检查用
    const app = createApp(App)
    const pinia = createPinia()

    app.use(pinia)
    app.config.errorHandler = (err, _instance, info) => { console.error('[Vue Error]', err, info); }
    app.mount(appEl)
}

// ============================================================
// TOUCH / CLICK PREVENTION (from index.html lines 652-691)
// ============================================================

(function () {
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener(
        'touchend',
        function (e) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) e.preventDefault();
            lastTouchEnd = now;
        },
        { passive: false }
    );

    // Prevent multi-touch zoom
    document.addEventListener(
        'touchmove',
        function (e) {
            if (e.touches.length > 1) e.preventDefault();
        },
        { passive: false }
    );

    // Prevent gesture zoom (Safari)
    document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    });
    document.addEventListener('gesturechange', function (e) {
        e.preventDefault();
    });
    document.addEventListener('gestureend', function (e) {
        e.preventDefault();
    });

    // Prevent double-click zoom
    document.addEventListener('dblclick', function (e) {
        e.preventDefault();
    });

    // Prevent Ctrl+/- zoom
    document.addEventListener('keydown', function (e) {
        if (
            (e.ctrlKey || e.metaKey) &&
            (e.key === '+' || e.key === '-' || e.key === '=')
        ) {
            e.preventDefault();
        }
    });
})();

// ============================================================
// VISIBILITY CHANGE HANDLER (from index.html lines 692-696)
// ============================================================

document.addEventListener('visibilitychange', function () {
    document.body.classList.toggle('app-paused', document.hidden);
});

// ============================================================
// DISABLE COPY / SELECT / CONTEXT MENU (from js/main.js lines 820-823)
// ============================================================

document.addEventListener('copy', (e) => e.preventDefault());
document.addEventListener('selectstart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dragstart', (e) => e.preventDefault());

// ============================================================
// DEV MODE — Initialize reactive dev config
// ============================================================

import { initDevMode } from './core/DevConfig';
initDevMode();
