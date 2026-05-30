/**
 * Global State Management for Fitness Coach
 * Handles data persistence via localStorage and calculations for calories/macros.
 */

window.FitState = {
    // Default Empty State
    data: {
        isOnboarded: false,
        user: {
            name: '',
            gender: 'male', // male | female
            age: 25,
            height: 175,
            weight: 70,
            targetWeight: 68,
            activityLevel: 'moderate', // low | moderate | high
            goal: 'lose', // lose | build | maintain
            bmr: 2000,
            waterGoal: 8, // glasses (250ml each)
            macros: { protein: 120, carbs: 200, fat: 60 }
        },
        dailyLogs: {}, // Key: YYYY-MM-DD
        weightHistory: [], // Array of { date: 'YYYY-MM-DD', weight: Number }
        chatHistory: [], // Array of { sender: 'ai'|'user', text: String, time: String }
        unlockedBadges: [] // Array of String IDs
    },

    // Initialize State
    init() {
        const saved = localStorage.getItem('fit_coach_state');
        if (saved) {
            try {
                this.data = JSON.parse(saved);
                // Ensure all expected objects exist
                if (!this.data.dailyLogs) this.data.dailyLogs = {};
                if (!this.data.weightHistory) this.data.weightHistory = [];
                if (!this.data.chatHistory) this.data.chatHistory = [];
                if (!this.data.unlockedBadges) this.data.unlockedBadges = [];
            } catch (e) {
                console.error("Failed to parse saved state, resetting...", e);
            }
        }
    },

    // Save State
    save() {
        localStorage.setItem('fit_coach_state', JSON.stringify(this.data));
        // Dispatch custom event to notify components about state updates
        window.dispatchEvent(new CustomEvent('fitStateUpdated', { detail: this.data }));
    },

    // Get current date string in local format YYYY-MM-DD
    getTodayStr() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Get log for today or create an empty one
    getTodayLog() {
        const today = this.getTodayStr();
        if (!this.data.dailyLogs[today]) {
            this.data.dailyLogs[today] = {
                caloriesConsumed: 0,
                waterIntake: 0,
                meals: [],
                workoutsCompleted: []
            };
            this.save();
        }
        return this.data.dailyLogs[today];
    },

    // Set Onboarding Data and Calculate Targets
    setOnboarding(userForm) {
        this.data.user = { ...this.data.user, ...userForm };
        this.data.isOnboarded = true;
        
        // Calculate BMR and TDEE using Mifflin-St Jeor Equation
        // Men: BMR = 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) + 5
        // Women: BMR = 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) - 161
        const weight = Number(this.data.user.weight);
        const height = Number(this.data.user.height);
        const age = Number(this.data.user.age);
        
        let bmrBase = 10 * weight + 6.25 * height - 5 * age;
        if (this.data.user.gender === 'male') {
            bmrBase += 5;
        } else {
            bmrBase -= 161;
        }
        
        // Activity Multiplier
        let multiplier = 1.2; // low
        if (this.data.user.activityLevel === 'moderate') {
            multiplier = 1.375;
        } else if (this.data.user.activityLevel === 'high') {
            multiplier = 1.55;
        }
        
        let tdee = Math.round(bmrBase * multiplier);
        
        // Goal Adjustment
        let bmrTarget = tdee;
        if (this.data.user.goal === 'lose') {
            bmrTarget = tdee - 450; // Caloric deficit
            if (bmrTarget < 1200) bmrTarget = 1200; // Safe threshold
        } else if (this.data.user.goal === 'build') {
            bmrTarget = tdee + 350; // Caloric surplus
        }
        
        this.data.user.bmr = bmrTarget;
        
        // Macros Calculation
        // Protein: 1.8g per kg for maintain/lose, 2.2g per kg for build
        let proteinMultiplier = 1.8;
        if (this.data.user.goal === 'build') proteinMultiplier = 2.2;
        const protein = Math.round(weight * proteinMultiplier);
        
        // Fats: 25% of calories
        // 1g fat = 9 kcal
        const fat = Math.round((bmrTarget * 0.25) / 9);
        
        // Carbs: Remaining calories
        // 1g protein = 4 kcal, 1g carb = 4 kcal
        const proteinCalories = protein * 4;
        const fatCalories = fat * 9;
        const carbCalories = Math.max(0, bmrTarget - (proteinCalories + fatCalories));
        const carbs = Math.round(carbCalories / 4);
        
        this.data.user.macros = { protein, carbs, fat };
        
        // Set Water Goal (typically 35ml per kg of bodyweight, which is ~3-4% of weight in deciliters)
        // 1 glass = 250ml. Water goal in glasses = (weight * 0.035) / 0.25
        this.data.user.waterGoal = Math.max(6, Math.round((weight * 0.035) / 0.25));
        
        // Add initial weight to weightHistory
        const today = this.getTodayStr();
        const existingWeightIdx = this.data.weightHistory.findIndex(h => h.date === today);
        if (existingWeightIdx !== -1) {
            this.data.weightHistory[existingWeightIdx].weight = weight;
        } else {
            this.data.weightHistory.push({ date: today, weight: weight });
        }
        
        // Add welcome message from AI
        this.data.chatHistory = [];
        this.addAiWelcomeMessage();
        
        this.save();
    },

    // Set custom weight log
    logWeight(weight) {
        const today = this.getTodayStr();
        const parsedWeight = parseFloat(weight);
        if (isNaN(parsedWeight)) return;

        const existingWeightIdx = this.data.weightHistory.findIndex(h => h.date === today);
        if (existingWeightIdx !== -1) {
            this.data.weightHistory[existingWeightIdx].weight = parsedWeight;
        } else {
            this.data.weightHistory.push({ date: today, weight: parsedWeight });
        }
        // Update user current weight
        this.data.user.weight = parsedWeight;
        this.save();
    },

    // Add logged food item
    addFoodItem(mealType, name, calories, protein, carbs, fat) {
        const log = this.getTodayLog();
        const newItem = {
            id: Date.now().toString(),
            name,
            calories: Number(calories) || 0,
            protein: Number(protein) || 0,
            carbs: Number(carbs) || 0,
            fat: Number(fat) || 0,
            time: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
        };
        
        log.meals.push(newItem);
        log.caloriesConsumed += newItem.calories;
        
        this.checkAndUnlockBadge('calorie_logged');
        if (log.caloriesConsumed >= this.data.user.bmr * 0.9 && log.caloriesConsumed <= this.data.user.bmr * 1.1) {
            this.checkAndUnlockBadge('calorie_goldilocks');
        }
        
        this.save();
    },

    // Delete logged food item
    deleteFoodItem(itemId) {
        const log = this.getTodayLog();
        const idx = log.meals.findIndex(m => m.id === itemId);
        if (idx !== -1) {
            const item = log.meals[idx];
            log.caloriesConsumed = Math.max(0, log.caloriesConsumed - item.calories);
            log.meals.splice(idx, 1);
            this.save();
        }
    },

    // Add Water Intake
    addWater(glasses = 1) {
        const log = this.getTodayLog();
        log.waterIntake = Math.max(0, log.waterIntake + glasses);
        
        if (log.waterIntake >= 1) {
            this.checkAndUnlockBadge('hydration_start');
        }
        if (log.waterIntake >= this.data.user.waterGoal) {
            this.checkAndUnlockBadge('hydration_master');
        }
        this.save();
    },

    // Complete Workout
    completeWorkout(workoutName) {
        const log = this.getTodayLog();
        if (!log.workoutsCompleted.includes(workoutName)) {
            log.workoutsCompleted.push(workoutName);
            this.checkAndUnlockBadge('workout_first');
            if (log.workoutsCompleted.length >= 2) {
                this.checkAndUnlockBadge('workout_double');
            }
            this.save();
        }
    },

    // Add Chat Message
    addChatMessage(sender, text) {
        const time = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        this.data.chatHistory.push({ sender, text, time });
        if (sender === 'user') {
            this.checkAndUnlockBadge('chat_active');
        }
        this.save();
    },

    // Clear Chat
    clearChat() {
        this.data.chatHistory = [];
        this.addAiWelcomeMessage();
        this.save();
    },

    // Add AI initial message helper
    addAiWelcomeMessage() {
        const name = this.data.user.name || 'Друже';
        const goalStr = this.data.user.goal === 'lose' ? 'схуднення' : this.data.user.goal === 'build' ? 'набору м\'язової маси' : 'підтримання форми';
        const message = `Привіт, ${name}! 👋 Я твій персональний AI Coach. На основі твого онбордингу я створив індивідуальну програму для твого цільового орієнтиру: **${goalStr}**.\n\nТвоя добова ціль калорій — **${this.data.user.bmr} ккал**.\n\nЗапитай мене про тренування чи харчування на сьогодні! Я готовий підказати найкращі кроки.`;
        const time = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        this.data.chatHistory.push({ sender: 'ai', text: message, time });
    },

    // Badge Achievement Helper
    checkAndUnlockBadge(badgeId) {
        if (!this.data.unlockedBadges.includes(badgeId)) {
            this.data.unlockedBadges.push(badgeId);
            this.save();
            // Trigger customized toast alert
            this.showBadgeNotification(badgeId);
        }
    },

    getBadgeDetails(badgeId) {
        const badges = {
            calorie_logged: { name: 'Перший перекус', desc: 'Зафіксовано першу страву', icon: '🍎' },
            calorie_goldilocks: { name: 'Ідеальний баланс', desc: 'Калорії в межах 10% від цілі', icon: '🎯' },
            hydration_start: { name: 'Водний старт', desc: 'Перша склянка води випита', icon: '💧' },
            hydration_master: { name: 'Аква-Чемпіон', desc: 'Добова норма води виконана', icon: '🔱' },
            workout_first: { name: 'Перша перемога', desc: 'Перше тренування завершено', icon: '⚡' },
            workout_double: { name: 'Подвійна сила', desc: 'Виконано два тренування за день', icon: '🔥' },
            chat_active: { name: 'AI Співрозмовник', desc: 'Почато діалог з AI тренером', icon: '💬' }
        };
        return badges[badgeId] || { name: 'Ачівка', desc: 'Нове досягнення!', icon: '🏆' };
    },

    showBadgeNotification(badgeId) {
        const badge = this.getBadgeDetails(badgeId);
        const toast = document.createElement('div');
        toast.className = 'badge-toast';
        toast.innerHTML = `
            <div class="toast-icon">${badge.icon}</div>
            <div class="toast-content">
                <div class="toast-title">Досягнення розблоковано!</div>
                <div class="toast-name">${badge.name}</div>
                <div class="toast-desc">${badge.desc}</div>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    },

    // Reset all data
    resetAll() {
        localStorage.removeItem('fit_coach_state');
        this.data = {
            isOnboarded: false,
            user: {
                name: '',
                gender: 'male',
                age: 25,
                height: 175,
                weight: 70,
                targetWeight: 68,
                activityLevel: 'moderate',
                goal: 'lose',
                bmr: 2000,
                waterGoal: 8,
                macros: { protein: 120, carbs: 200, fat: 60 }
            },
            dailyLogs: {},
            weightHistory: [],
            chatHistory: [],
            unlockedBadges: []
        };
        this.save();
    }
};

// Initialize right away
window.FitState.init();
