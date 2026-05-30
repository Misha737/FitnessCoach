/**
 * Calorie Tracker, Macros & Hydration Module
 * Manages UI updates for calorie rings, macro bars, water logger, and meal diaries.
 */

(function() {
    // DOM Cache
    const ringCircle = document.getElementById('calorie-progress-circle');
    const remainingVal = document.getElementById('cal-value-remaining');
    const targetVal = document.getElementById('cal-target-val');
    const consumedVal = document.getElementById('cal-consumed-val');

    // Macros
    const pRatio = document.getElementById('macro-protein-ratio');
    const cRatio = document.getElementById('macro-carbs-ratio');
    const fRatio = document.getElementById('macro-fat-ratio');
    const pFill = document.getElementById('macro-protein-fill');
    const cFill = document.getElementById('macro-carbs-fill');
    const fFill = document.getElementById('macro-fat-fill');

    // Water
    const waterProgressText = document.getElementById('water-progress-text');
    const btnWaterMinus = document.getElementById('btn-water-minus');
    const btnWaterPlus = document.getElementById('btn-water-plus');
    const glassesGrid = document.getElementById('water-glasses-grid');

    // Meal Logs & Modal
    const mealsContainer = document.getElementById('meals-list-container');
    const btnTriggerModal = document.getElementById('btn-trigger-food-modal');
    const modalFood = document.getElementById('modal-food-logger');
    const btnCloseModal = document.getElementById('btn-close-food-modal');
    const quickSuggestions = document.getElementById('quick-food-suggestions');

    // Custom food inputs
    const inputFoodName = document.getElementById('custom-food-name');
    const inputFoodCal = document.getElementById('custom-food-cal');
    const inputFoodProtein = document.getElementById('custom-food-protein');
    const inputFoodCarbs = document.getElementById('custom-food-carbs');
    const inputFoodFat = document.getElementById('custom-food-fat');
    const btnSaveCustomFood = document.getElementById('btn-save-custom-food');

    // Quick Ukrainian food suggestions
    const foodPresets = [
        { name: '🍳 Яєчня (2 яйця)', cal: 150, p: 13, c: 1, f: 10 },
        { name: '🥣 Вівсянка (100г)', cal: 340, p: 12, c: 60, f: 6 },
        { name: '🍗 Куряче філе (150г)', cal: 165, p: 35, c: 0, f: 3 },
        { name: '🥗 Салат овочевий', cal: 80, p: 2, c: 8, f: 5 },
        { name: '🍚 Рис відварений (150г)', cal: 195, p: 4, c: 42, f: 0.5 },
        { name: '🥤 Протеїновий шейк', cal: 140, p: 25, c: 3, f: 2 },
        { name: '🍎 Яблуко велике', cal: 95, p: 0.5, c: 25, f: 0.3 },
        { name: '🧀 Сир кисломолочний (150г)', cal: 170, p: 27, c: 4, f: 5 }
    ];

    function init() {
        if (!window.FitState.data.isOnboarded) return;

        updateCalorieDashboard();
        renderWaterGlasses();
        renderMealDiary();
        renderQuickPresets();

        // Hydration Event Handlers
        btnWaterPlus.onclick = () => {
            window.FitState.addWater(1);
            updateCalorieDashboard();
            renderWaterGlasses();
        };

        btnWaterMinus.onclick = () => {
            window.FitState.addWater(-1);
            updateCalorieDashboard();
            renderWaterGlasses();
        };

        // Modal triggers
        btnTriggerModal.onclick = () => {
            modalFood.classList.add('active');
            inputFoodName.value = '';
            inputFoodCal.value = '';
            inputFoodProtein.value = '';
            inputFoodCarbs.value = '';
            inputFoodFat.value = '';
        };

        btnCloseModal.onclick = () => {
            modalFood.classList.remove('active');
        };

        modalFood.onclick = (e) => {
            if (e.target === modalFood) {
                modalFood.classList.remove('active');
            }
        };

        // Save Custom Food Item
        btnSaveCustomFood.onclick = () => {
            const name = inputFoodName.value.trim();
            const cal = parseInt(inputFoodCal.value);
            const p = parseInt(inputFoodProtein.value) || 0;
            const c = parseInt(inputFoodCarbs.value) || 0;
            const f = parseInt(inputFoodFat.value) || 0;

            if (!name) {
                alert('Будь ласка, введіть назву страви.');
                return;
            }
            if (isNaN(cal) || cal < 0) {
                alert('Будь ласка, введіть кількість калорій.');
                return;
            }

            window.FitState.addFoodItem('custom', name, cal, p, c, f);
            modalFood.classList.remove('active');
            updateCalorieDashboard();
            renderMealDiary();
        };

        // Handle State events updates
        window.removeEventListener('fitStateUpdated', handleStateUpdate);
        window.addEventListener('fitStateUpdated', handleStateUpdate);
    }

    function handleStateUpdate() {
        updateCalorieDashboard();
        renderMealDiary();
        renderWaterGlasses();
    }

    // Update calorie circular ring and macro balance bars
    function updateCalorieDashboard() {
        const state = window.FitState.data;
        const log = window.FitState.getTodayLog();

        const target = state.user.bmr;
        const consumed = log.caloriesConsumed;
        const remaining = Math.max(0, target - consumed);

        targetVal.innerText = target;
        consumedVal.innerText = consumed;
        remainingVal.innerText = remaining;

        // Render circular progress ring SVG calculations
        // Radius of circle = 75, circumference = 2 * PI * R = 471.2
        const circumference = 471.2;
        const ratio = Math.min(1, consumed / target);
        const offset = circumference - (ratio * circumference);
        ringCircle.style.strokeDashoffset = offset;

        // Macros details
        const macroGoals = state.user.macros;
        
        // Sum macros logged today
        let totalP = 0, totalC = 0, totalF = 0;
        log.meals.forEach(m => {
            totalP += m.protein;
            totalC += m.carbs;
            totalF += m.fat;
        });

        pRatio.innerText = `${totalP}г / ${macroGoals.protein}г`;
        cRatio.innerText = `${totalC}г / ${macroGoals.carbs}г`;
        fRatio.innerText = `${totalF}г / ${macroGoals.fat}г`;

        pFill.style.width = `${Math.min(100, (totalP / macroGoals.protein) * 100)}%`;
        cFill.style.width = `${Math.min(100, (totalC / macroGoals.carbs) * 100)}%`;
        fFill.style.width = `${Math.min(100, (totalF / macroGoals.fat) * 100)}%`;
    }

    // Render interactive hydration visual elements
    function renderWaterGlasses() {
        const state = window.FitState.data;
        const log = window.FitState.getTodayLog();
        
        const goal = state.user.waterGoal;
        const current = log.waterIntake;

        waterProgressText.innerText = `Випито: ${current} / ${goal} склянок`;

        glassesGrid.innerHTML = '';
        // Create exact count of slots based on user water goal
        for (let i = 1; i <= goal; i++) {
            const cup = document.createElement('div');
            cup.className = `water-cup-item ${i <= current ? 'active' : ''}`;
            cup.innerText = '💧';
            cup.style.cursor = 'pointer';
            
            // Allow logging by clicking on the glass directly
            cup.onclick = () => {
                if (i <= current) {
                    // Tap an active glass to set water intake exactly to that level
                    window.FitState.data.dailyLogs[window.FitState.getTodayStr()].waterIntake = i - 1;
                    window.FitState.save();
                } else {
                    // Tap an inactive glass to fill up to that level
                    window.FitState.data.dailyLogs[window.FitState.getTodayStr()].waterIntake = i;
                    window.FitState.save();
                }
                updateCalorieDashboard();
                renderWaterGlasses();
            };

            glassesGrid.appendChild(cup);
        }
    }

    // Render the Quick Preset tags in the food modal
    function renderQuickPresets() {
        quickSuggestions.innerHTML = '';
        foodPresets.forEach(item => {
            const tag = document.createElement('div');
            tag.className = 'quick-tag';
            tag.innerText = item.name;
            tag.onclick = () => {
                // Add food on click right away and close modal
                window.FitState.addFoodItem('preset', item.name, item.cal, item.p, item.c, item.f);
                modalFood.classList.remove('active');
                updateCalorieDashboard();
                renderMealDiary();
            };
            quickSuggestions.appendChild(tag);
        });
    }

    // Render daily meals list with interactive deletion support
    function renderMealDiary() {
        const log = window.FitState.getTodayLog();
        mealsContainer.innerHTML = '';

        if (!log.meals || log.meals.length === 0) {
            mealsContainer.innerHTML = `
                <div class="empty-meals-box">
                    🍽️ Ви ще не додали жодної страви на сьогодні.
                </div>
            `;
            return;
        }

        log.meals.forEach(m => {
            const card = document.createElement('div');
            card.className = 'food-log-card';
            card.innerHTML = `
                <div class="food-card-info">
                    <h4>${m.name}</h4>
                    <p>Б: ${m.protein}г • В: ${m.carbs}г • Ж: ${m.fat}г • 🕐 ${m.time}</p>
                </div>
                <div class="food-card-macros">
                    <span class="food-card-calories">${m.calories} ккал</span>
                    <button class="btn-delete-food" data-id="${m.id}" title="Видалити запис">&times;</button>
                </div>
            `;

            // Attach delete handler
            card.querySelector('.btn-delete-food').onclick = function() {
                const itemId = this.getAttribute('data-id');
                window.FitState.deleteFoodItem(itemId);
                updateCalorieDashboard();
                renderMealDiary();
            };

            mealsContainer.appendChild(card);
        });
    }

    // Listeners bootstrap hooks
    window.addEventListener('fitAppLaunched', init);
    window.addEventListener('DOMContentLoaded', init);
})();
