/**
 * LoadFast for SillyTavern
 * Lightweight startup optimization extension.
 */

(function () {
    'use strict';

    const EXTENSION_NAME = 'loadfast';
    const STORAGE_KEY = 'loadfast_enabled';

    const CONFIG = {
        enabled: true,

        // Delay non-critical work until the browser is idle.
        idleDelay: 250,

        // Prevent repeated startup operations.
        debounceDelay: 100,

        // Give the main UI priority.
        prioritizeUI: true
    };

    let startupComplete = false;
    let startupTimer = null;

    function log(message) {
        console.log(`[LoadFast] ${message}`);
    }

    function idle(callback, timeout = 1000) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout });
        } else {
            setTimeout(callback, CONFIG.idleDelay);
        }
    }

    function yieldToBrowser(callback) {
        if (typeof scheduler !== 'undefined' && scheduler.postTask) {
            scheduler.postTask(callback, {
                priority: 'background'
            });
        } else {
            idle(callback);
        }
    }

    function optimizeDOM() {
        // Tell the browser that the application is interactive.
        document.documentElement.classList.add('loadfast-active');

        // Avoid unnecessary animations during initial rendering.
        document.documentElement.classList.add('loadfast-starting');

        requestAnimationFrame(() => {
            document.documentElement.classList.remove('loadfast-starting');
        });
    }

    function deferNonCriticalWork() {
        yieldToBrowser(() => {
            // Force browser layout only after the main UI has rendered.
            document.body?.classList.add('loadfast-ready');

            idle(() => {
                startupComplete = true;
                document.documentElement.classList.add('loadfast-complete');

                log('Background initialization complete.');
            });
        });
    }

    function startup() {
        if (startupComplete || startupTimer) {
            return;
        }

        optimizeDOM();

        startupTimer = setTimeout(() => {
            startupTimer = null;
            deferNonCriticalWork();
        }, CONFIG.debounceDelay);

        log('Startup optimization enabled.');
    }

    function createSettings() {
        const settingsHtml = `
            <div class="loadfast-settings">
                <label class="checkbox_label">
                    <input
                        id="loadfast-enabled"
                        type="checkbox"
                        ${CONFIG.enabled ? 'checked' : ''}
                    >
                    <span>Enable LoadFast</span>
                </label>

                <div class="loadfast-info">
                    Prioritizes the SillyTavern interface during startup
                    and postpones non-critical browser work.
                </div>
            </div>
        `;

        return settingsHtml;
    }

    function registerSettings() {
        // SillyTavern extension settings panel.
        const container = document.querySelector('#extensions_settings');

        if (!container) {
            return;
        }

        if (document.querySelector('#loadfast-settings')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.id = 'loadfast-settings';
        wrapper.innerHTML = `
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>⚡ LoadFast</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
                </div>

                <div class="inline-drawer-content">
                    ${createSettingsHtml()}
                </div>
            </div>
        `;

        container.appendChild(wrapper);

        const checkbox = wrapper.querySelector('#loadfast-enabled');

        checkbox?.addEventListener('change', () => {
            CONFIG.enabled = checkbox.checked;

            localStorage.setItem(
                STORAGE_KEY,
                CONFIG.enabled ? 'true' : 'false'
            );

            document.documentElement.classList.toggle(
                'loadfast-disabled',
                !CONFIG.enabled
            );
        });
    }

    function createSettingsHtml() {
        return `
            <div class="loadfast-settings">
                <label class="checkbox_label">
                    <input
                        id="loadfast-enabled"
                        type="checkbox"
                        ${CONFIG.enabled ? 'checked' : ''}
                    >
                    <span>Enable LoadFast</span>
                </label>

                <div class="loadfast-info">
                    ⚡ Prioritizes the SillyTavern interface during startup
                    and postpones non-critical work.
                </div>
            </div>
        `;
    }

    function loadConfig() {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved !== null) {
            CONFIG.enabled = saved === 'true';
        }

        document.documentElement.classList.toggle(
            'loadfast-disabled',
            !CONFIG.enabled
        );
    }

    function observeSettings() {
        const observer = new MutationObserver(() => {
            registerSettings();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        registerSettings();
    }

    function init() {
        loadConfig();

        if (!CONFIG.enabled) {
            log('Disabled.');
            return;
        }

        startup();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                observeSettings();
            }, { once: true });
        } else {
            observeSettings();
        }
    }

    // Start as early as possible.
    init();

})();