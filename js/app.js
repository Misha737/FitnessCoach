/**
 * Core application router & SPA bootstrapping module.
 * Coordinates page transitions, navigation panels toggling, and global data resets.
 */

(function() {
    // DOM Cache
    const navButtons = document.querySelectorAll('.nav-btn');
    const appPages = document.querySelectorAll('.app-page');
    
    const headerUserName = document.getElementById('header-user-name');
    const headerAvatar = document.getElementById('header-avatar');
    const btnResetData = document.getElementById('btn-reset-data');

    const onboardingSec = document.getElementById('onboarding-flow');
    const mainAppSec = document.getElementById('main-app');

    function init() {
        // If onboarded, initialize application hub
        if (window.FitState.data.isOnboarded) {
            bootstrapAppModules();
        }

        // Bottom Navigation SPA page swaps
        navButtons.forEach(btn => {
            btn.onclick = function() {
                const targetPageId = this.getAttribute('data-page');
                
                // Swap active page
                appPages.forEach(page => {
                    if (page.id === targetPageId) {
                        page.classList.add('active');
                    } else {
                        page.classList.remove('active');
                    }
                });

                // Swap active navigation link highlights
                navButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // If going to chat page, scroll chat logs immediately to bottom
                if (targetPageId === 'page-chat') {
                    const chatBox = document.getElementById('chat-messages-container');
                    if (chatBox) {
                        setTimeout(() => chatBox.scrollTop = chatBox.scrollHeight, 100);
                    }
                }
            };
        });

        // App reset trigger
        btnResetData.onclick = function() {
            const consent = confirm('Ви дійсно бажаєте скинути всі збережені дані тренувань, калорій та розпочати онбординг знову?');
            if (consent) {
                // Clear localStorage & state variables
                window.FitState.resetAll();
                
                // Triggers onboarding module to restore layout inputs
                if (window.resetOnboardingView) {
                    window.resetOnboardingView();
                } else {
                    location.reload();
                }
            }
        };

        // Watch for custom app launch events fired by onboarding success
        window.addEventListener('fitAppLaunched', () => {
            bootstrapAppModules();
        });
    }

    // Set user headers and trigger loaders for sub-modules
    function bootstrapAppModules() {
        const u = window.FitState.data.user;
        
        // Render name inside top profile header
        headerUserName.innerText = u.name || 'Спортсмен';
        
        // Style dynamic emoji avatar based on gender choices
        if (u.gender === 'female') {
            headerAvatar.innerText = '🏃‍♀️';
            headerAvatar.style.background = 'linear-gradient(135deg, #e84393 0%, #fd79a8 100%)';
        } else {
            headerAvatar.innerText = '🏃‍♂️';
            headerAvatar.style.background = 'linear-gradient(135deg, #0984e3 0%, #74b9ff 100%)';
        }
    }

    // Dom ready hooks
    window.addEventListener('DOMContentLoaded', init);
})();
