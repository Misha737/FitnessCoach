// ==========================================================================
// APP STATE & CONFIGURATION
// ==========================================================================
const SVG_CIRCUMFERENCE = 2 * Math.PI * 70; // 439.82

let state = {
    userProfile: {
        name: "",
        gender: "male",
        age: 25,
        height: 175,
        weight: 70,
        targetWeight: 65,
        goal: "weight-loss",
        activity: 1.375,
        trainingLocation: "home"
    },
    onboardingDone: false,
    dailyLogs: [],
    checklistState: {
        water: false,
        workout: false,
        meals: false
    },
    weightHistory: [],
    calorieHistory: [],
    chatHistory: []
};

// Standard presets for meals & workouts (will be augmented by active user goal)
const PRESETS = {
    food: [
        { name: "🍳 Яєчня (2 яйця) + Тост", cal: 280 },
        { name: "🥣 Вівсянка з медом та бананом", cal: 320 },
        { name: "🍗 Куряче філе з рисом", cal: 450 },
        { name: "🥗 Салат з тунцем та оливками", cal: 350 },
        { name: "🍎 Яблуко з жменею мигдалю", cal: 180 },
        { name: "🥛 Протеїновий шейк", cal: 160 }
    ],
    workout: [
        { name: "🏃‍♂️ Швидкий біг (30 хв)", cal: 350 },
        { name: "💪 Силове тренування (45 хв)", cal: 300 },
        { name: "🤸‍♂️ Кругове HIIT тренування", cal: 280 },
        { name: "🧘‍♀️ Йога та розтяжка (30 хв)", cal: 120 },
        { name: "🚴‍♂️ Їзда на велосипеді (40 хв)", cal: 260 }
    ]
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================
function initApp() {
    loadStateFromStorage();
    initEventListeners();
    
    if (state.onboardingDone) {
        showScreen("main-app-screen");
        updateDashboard();
        generateGuides();
        renderCharts();
    } else {
        showScreen("onboarding-screen");
        setupOnboardingStep(1);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

// Load state from localStorage or initialize with beautiful dummy data
function loadStateFromStorage() {
    try {
        const savedState = localStorage.getItem("fitai_coach_state");
        if (savedState) {
            const parsed = JSON.parse(savedState);
            // Safe deep merge to prevent properties from being undefined
            state = {
                userProfile: { ...state.userProfile, ...parsed.userProfile },
                onboardingDone: parsed.onboardingDone || false,
                dailyLogs: parsed.dailyLogs || [],
                checklistState: { ...state.checklistState, ...parsed.checklistState },
                weightHistory: parsed.weightHistory || [],
                calorieHistory: parsed.calorieHistory || [],
                chatHistory: parsed.chatHistory || []
            };
            
            // Ensure date transitions are handled (reset dailyLogs if it's a new day)
            const todayStr = getTodayDateString();
            const lastActiveDate = localStorage.getItem("fitai_last_active_date");
            
            if (lastActiveDate !== todayStr) {
                // Save yesterday's data to history before resetting
                if (lastActiveDate) {
                    archiveYesterdayData(lastActiveDate);
                }
                state.dailyLogs = [];
                state.checklistState = { water: false, workout: false, meals: false };
                localStorage.setItem("fitai_last_active_date", todayStr);
                saveStateToStorage();
            }
        } else {
            initializeDummyHistory();
        }
    } catch (e) {
        console.error("Error loading state, resetting to default:", e);
        localStorage.removeItem("fitai_coach_state");
        localStorage.removeItem("fitai_last_active_date");
        initializeDummyHistory();
    }
}

function initializeDummyHistory() {
    const today = new Date();
    const weightHistory = [];
    const calorieHistory = [];
    
    // Generate last 6 days of dummy statistics
    for (let i = 6; i > 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateLabel = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth()+1).toString().padStart(2, '0')}`;
        
        weightHistory.push({
            date: dateLabel,
            weight: (72.5 - (6 - i) * 0.4).toFixed(1)
        });
        
        calorieHistory.push({
            date: dateLabel,
            eaten: Math.floor(1700 + Math.random() * 400),
            goal: 2000
        });
    }
    
    state.weightHistory = weightHistory;
    state.calorieHistory = calorieHistory;
    
    const todayStr = getTodayDateString();
    localStorage.setItem("fitai_last_active_date", todayStr);
}

function saveStateToStorage() {
    localStorage.setItem("fitai_coach_state", JSON.stringify(state));
}

function archiveYesterdayData(dateStr) {
    if (!state.onboardingDone || !dateStr) return;
    
    try {
        // Find eaten calories from yesterday
        const eaten = state.dailyLogs
            .filter(l => l.type === 'food')
            .reduce((sum, l) => sum + l.value, 0);
            
        const goal = calculateDailyCalories();
        
        // Remove oldest if history is longer than 7 days
        if (state.calorieHistory.length >= 7) {
            state.calorieHistory.shift();
        }
        
        // Check if yesterday is already archived
        const formattedDate = dateStr.substring(0, 5); // DD.MM
        if (!state.calorieHistory.some(h => h.date === formattedDate)) {
            state.calorieHistory.push({
                date: formattedDate,
                eaten: eaten,
                goal: goal
            });
        }
    } catch (e) {
        console.error("Error archiving yesterday data:", e);
    }
}

function getTodayDateString() {
    const today = new Date();
    return `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth()+1).toString().padStart(2, '0')}.${today.getFullYear()}`;
}

// ==========================================================================
// SPA NAVIGATION SYSTEM
// ==========================================================================
function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(screenId).classList.add("active");
}

function showView(viewId) {
    document.querySelectorAll(".app-view").forEach(v => v.classList.remove("active"));
    document.getElementById(`${viewId}-view`).classList.add("active");
    
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.querySelector(`[data-view="${viewId}"]`).classList.add("active");
    
    // Custom callbacks for view transitions
    if (viewId === 'stats') {
        renderCharts();
    } else if (viewId === 'chat' && state.chatHistory.length === 0) {
        initAICoachChat();
    }
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================
function initEventListeners() {
    // Bottom Nav Tabs Click
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            const viewId = item.getAttribute("data-view");
            showView(viewId);
        });
    });
    
    // Onboarding Buttons
    document.querySelectorAll(".btn-next-step").forEach(btn => {
        btn.addEventListener("click", () => {
            const currentStep = parseInt(document.querySelector(".onboarding-step.active").getAttribute("data-step"));
            if (validateStep(currentStep)) {
                setupOnboardingStep(currentStep + 1);
            }
        });
    });

    document.querySelectorAll(".btn-prev-step").forEach(btn => {
        btn.addEventListener("click", () => {
            const currentStep = parseInt(document.querySelector(".onboarding-step.active").getAttribute("data-step"));
            setupOnboardingStep(currentStep - 1);
        });
    });

    const btnGenerate = document.querySelector(".btn-generate-plan");
    if (btnGenerate) {
        btnGenerate.addEventListener("click", () => {
            saveOnboardingData();
            setupOnboardingStep(6);
            runAIGenerationAnimation();
        });
    }

    // Reset Button
    document.getElementById("btn-reset-profile").addEventListener("click", () => {
        if (confirm("Ви впевнені, що хочете скинути дані профілю? Вся історія калорій та ваги буде видалена.")) {
            localStorage.removeItem("fitai_coach_state");
            state.onboardingDone = false;
            state.dailyLogs = [];
            state.chatHistory = [];
            state.checklistState = { water: false, workout: false, meals: false };
            saveStateToStorage();
            window.location.reload();
        }
    });

    // Checklist inputs
    document.getElementById("chk-water").addEventListener("change", (e) => {
        state.checklistState.water = e.target.checked;
        saveStateToStorage();
    });
    document.getElementById("chk-workout").addEventListener("change", (e) => {
        state.checklistState.workout = e.target.checked;
        saveStateToStorage();
    });
    document.getElementById("chk-meals").addEventListener("change", (e) => {
        state.checklistState.meals = e.target.checked;
        saveStateToStorage();
    });

    // Modals controllers
    setupModal("btn-add-food-modal", "modal-add-food", "btn-close-food");
    setupModal("btn-add-workout-modal", "modal-add-workout", "btn-close-workout");
    setupModal("btn-update-weight-modal", "modal-update-weight", "btn-close-weight");

    // Modal saving buttons
    document.getElementById("btn-save-food").addEventListener("click", saveCustomFood);
    document.getElementById("btn-save-workout").addEventListener("click", saveCustomWorkout);
    document.getElementById("btn-save-weight").addEventListener("click", saveUpdatedWeight);

    // Chat sending message
    document.getElementById("btn-send-message").addEventListener("click", handleUserMessage);
    document.getElementById("chat-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleUserMessage();
    });

    // Guides tab switcher (Workout / Nutrition)
    document.querySelectorAll(".guide-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".guide-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const subView = tab.getAttribute("data-tab");
            document.querySelectorAll(".guide-sub-view").forEach(sv => sv.classList.remove("active"));
            document.getElementById(`guide-${subView}-content`).classList.add("active");
        });
    });
}

function setupModal(triggerId, modalId, closeId) {
    const trigger = document.getElementById(triggerId);
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeId);
    
    if (trigger && modal) {
        trigger.addEventListener("click", () => {
            modal.classList.add("active");
            // Perform preset injections if adding food or workouts
            if (modalId === 'modal-add-food') {
                populatePresets('food', 'food-presets-container');
            } else if (modalId === 'modal-add-workout') {
                populatePresets('workout', 'workout-presets-container');
            } else if (modalId === 'modal-update-weight') {
                document.getElementById("weight-input-val").value = state.userProfile.weight;
            }
        });
    }
    
    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => {
            modal.classList.remove("active");
        });
    }

    // Close on overlay click
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.classList.remove("active");
            }
        });
    }
}

// ==========================================================================
// ONBOARDING PROCESS LOGIC
// ==========================================================================
function setupOnboardingStep(stepNum) {
    document.querySelectorAll(".onboarding-step").forEach(step => {
        step.classList.remove("active");
    });
    
    const activeStep = document.querySelector(`.onboarding-step[data-step="${stepNum}"]`);
    if (activeStep) {
        activeStep.classList.add("active");
    }
    
    const progressContainer = document.querySelector(".progress-bar-container");
    const progressBar = document.getElementById("onboarding-progress");
    
    if (stepNum > 1 && stepNum < 6) {
        progressContainer.style.display = "block";
        const progressPercent = ((stepNum - 1) / 4) * 100;
        progressBar.style.width = `${progressPercent}%`;
    } else {
        progressContainer.style.display = "none";
    }
}

function validateStep(stepNum) {
    if (stepNum === 2) {
        const nameVal = document.getElementById("user-name").value.trim();
        if (!nameVal) {
            alert("Будь ласка, введи своє ім'я.");
            return false;
        }
    } else if (stepNum === 3) {
        const age = parseInt(document.getElementById("user-age").value);
        const height = parseInt(document.getElementById("user-height").value);
        const weight = parseFloat(document.getElementById("user-weight").value);
        const target = parseFloat(document.getElementById("user-target-weight").value);
        
        if (isNaN(age) || age < 10 || age > 100) {
            alert("Будь ласка, введи коректний вік (від 10 до 100 років).");
            return false;
        }
        if (isNaN(height) || height < 100 || height > 250) {
            alert("Будь ласка, введи коректний зріст (від 100 до 250 см).");
            return false;
        }
        if (isNaN(weight) || weight < 30 || weight > 250) {
            alert("Будь ласка, введи коректну поточну вагу.");
            return false;
        }
        if (isNaN(target) || target < 30 || target > 250) {
            alert("Будь ласка, введи коректну цільову вагу.");
            return false;
        }
    }
    return true;
}

function saveOnboardingData() {
    state.userProfile.name = document.getElementById("user-name").value.trim();
    state.userProfile.gender = document.querySelector('input[name="gender"]:checked').value;
    state.userProfile.age = parseInt(document.getElementById("user-age").value);
    state.userProfile.height = parseInt(document.getElementById("user-height").value);
    state.userProfile.weight = parseFloat(document.getElementById("user-weight").value);
    state.userProfile.targetWeight = parseFloat(document.getElementById("user-target-weight").value);
    state.userProfile.goal = document.querySelector('input[name="goal"]:checked').value;
    state.userProfile.activity = parseFloat(document.getElementById("user-activity").value);
    state.userProfile.trainingLocation = document.querySelector('input[name="training-location"]:checked').value;
}

function runAIGenerationAnimation() {
    const chk1 = document.getElementById("chk-step-1");
    const chk2 = document.getElementById("chk-step-2");
    const chk3 = document.getElementById("chk-step-3");
    const chk4 = document.getElementById("chk-step-4");
    const statusText = document.getElementById("ai-loading-status");
    
    // Step 1: Physical Parameters Analysis
    chk1.classList.add("active");
    statusText.innerText = "Аналіз анкети та фізичних параметрів...";
    
    setTimeout(() => {
        chk1.classList.remove("active");
        chk1.classList.add("done");
        chk2.classList.add("active");
        statusText.innerText = "Розрахунок добового обміну речовин (BMR/TDEE)...";
        
        setTimeout(() => {
            chk2.classList.remove("active");
            chk2.classList.add("done");
            chk3.classList.add("active");
            statusText.innerText = "Складання індивідуального плану харчування...";
            
            setTimeout(() => {
                chk3.classList.remove("active");
                chk3.classList.add("done");
                chk4.classList.add("active");
                statusText.innerText = "Генерація плану тренувань під ваші цілі...";
                
                setTimeout(() => {
                    chk4.classList.remove("active");
                    chk4.classList.add("done");
                    statusText.innerText = "План згенеровано! Готуємо дашборд...";
                    
                    setTimeout(() => {
                        // Complete onboarding
                        state.onboardingDone = true;
                        
                        // Push initial weight to history if empty
                        const today = new Date();
                        const dateLabel = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth()+1).toString().padStart(2, '0')}`;
                        
                        // Overwrite last weight entry with the onboarding weight
                        if (state.weightHistory.length > 0) {
                            state.weightHistory[state.weightHistory.length - 1] = {
                                date: dateLabel,
                                weight: state.userProfile.weight
                            };
                        } else {
                            state.weightHistory.push({
                                date: dateLabel,
                                weight: state.userProfile.weight
                            });
                        }
                        
                        saveStateToStorage();
                        
                        // Show main dashboard
                        showScreen("main-app-screen");
                        showView("dashboard");
                        updateDashboard();
                        generateGuides();
                        renderCharts();
                    }, 800);
                }, 1000);
            }, 1000);
        }, 1000);
    }, 1000);
}

// ==========================================================================
// CALCULATIONS & FORMULAS (Mifflin-St Jeor)
// ==========================================================================
function calculateDailyCalories() {
    const { gender, weight, height, age, goal, activity } = state.userProfile;
    let bmr = 0;
    
    if (gender === 'male') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    
    const tdee = bmr * activity;
    
    // Adjust based on goal
    let targetCal = 0;
    if (goal === 'weight-loss') {
        targetCal = tdee - 500;
        if (targetCal < 1200) targetCal = 1200; // Safe minimum limit
    } else if (goal === 'muscle-gain') {
        targetCal = tdee + 300;
    } else if (goal === 'maintain') {
        targetCal = tdee;
    } else if (goal === 'endurance') {
        targetCal = tdee + 150;
    }
    
    return Math.round(targetCal);
}

function calculateMacros() {
    const totalCal = calculateDailyCalories();
    const weight = state.userProfile.weight;
    const goal = state.userProfile.goal;
    
    let proteinGrams = 0;
    let fatGrams = 0;
    let carbGrams = 0;
    
    if (goal === 'muscle-gain') {
        proteinGrams = Math.round(weight * 2.2); // high protein
        fatGrams = Math.round((totalCal * 0.25) / 9); // 25% fats
        carbGrams = Math.round((totalCal - (proteinGrams * 4) - (fatGrams * 9)) / 4);
    } else if (goal === 'weight-loss') {
        proteinGrams = Math.round(weight * 1.8);
        fatGrams = Math.round((totalCal * 0.25) / 9); // 25% fats
        carbGrams = Math.round((totalCal - (proteinGrams * 4) - (fatGrams * 9)) / 4);
    } else {
        proteinGrams = Math.round(weight * 1.5);
        fatGrams = Math.round((totalCal * 0.25) / 9);
        carbGrams = Math.round((totalCal - (proteinGrams * 4) - (fatGrams * 9)) / 4);
    }
    
    return {
        proteins: proteinGrams,
        fats: fatGrams,
        carbs: carbGrams
    };
}

// ==========================================================================
// CALORIE TRACKER & DASHBOARD UPDATE
// ==========================================================================
function updateDashboard() {
    if (!state.onboardingDone) return;
    
    // Set Header Info
    document.getElementById("lbl-username").innerText = state.userProfile.name;
    document.getElementById("avatar-display").innerText = state.userProfile.name.charAt(0).toUpperCase();
    
    // Set Goal Badge
    const goalLabels = {
        "weight-loss": "Схуднення",
        "muscle-gain": "Набір маси",
        "maintain": "Підтримка форми",
        "endurance": "Витривалість"
    };
    document.getElementById("lbl-user-goal-badge").innerText = goalLabels[state.userProfile.goal] || "Форма";
    
    // Set Current Date
    const today = new Date();
    const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
    const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П' + 'ятниця', 'Субота'];
    document.getElementById("lbl-today-date").innerText = `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]}`;

    // Calculations
    const goalCal = calculateDailyCalories();
    const eatenCal = state.dailyLogs
        .filter(l => l.type === 'food')
        .reduce((sum, l) => sum + l.value, 0);
    const burnedCal = state.dailyLogs
        .filter(l => l.type === 'workout')
        .reduce((sum, l) => sum + l.value, 0);
    const remainingCal = goalCal - eatenCal + burnedCal;

    // Update Text Elements
    document.getElementById("lbl-calories-goal").innerText = goalCal;
    document.getElementById("lbl-calories-eaten").innerText = eatenCal;
    document.getElementById("lbl-calories-burned").innerText = burnedCal;
    document.getElementById("lbl-calories-remaining").innerText = remainingCal;

    // Update Circular Progress Bar
    const progressFill = Math.min(eatenCal / (goalCal + burnedCal), 1);
    const ringCircle = document.getElementById("calorie-progress-bar");
    
    if (ringCircle) {
        const offset = SVG_CIRCUMFERENCE - (progressFill * SVG_CIRCUMFERENCE);
        ringCircle.style.strokeDasharray = `${SVG_CIRCUMFERENCE} ${SVG_CIRCUMFERENCE}`;
        ringCircle.style.strokeDashoffset = offset;
        
        // Dynamic coloring: green if under limit, rose if over limit (goalCal)
        if (eatenCal > goalCal + burnedCal) {
            ringCircle.style.stroke = "url(#rose-gradient)";
        } else {
            ringCircle.style.stroke = "url(#emerald-gradient)";
        }
    }

    // Sync checklist state
    document.getElementById("chk-water").checked = state.checklistState.water;
    document.getElementById("chk-workout").checked = state.checklistState.workout;
    document.getElementById("chk-meals").checked = state.checklistState.meals;

    // Render daily logs list
    renderDailyLogs();
}

function renderDailyLogs() {
    const container = document.getElementById("logs-list-container");
    const emptyState = document.getElementById("logs-empty-state");
    const logsCount = document.getElementById("lbl-logs-count");
    
    if (state.dailyLogs.length === 0) {
        container.style.display = "none";
        emptyState.style.display = "flex";
        logsCount.innerText = "0 записів";
    } else {
        container.style.display = "flex";
        emptyState.style.display = "none";
        logsCount.innerText = `${state.dailyLogs.length} записів`;
        
        container.innerHTML = "";
        state.dailyLogs.forEach(log => {
            const logItem = document.createElement("div");
            logItem.className = "log-item";
            
            const isFood = log.type === 'food';
            const icon = isFood ? 'restaurant_menu' : 'fitness_center';
            const iconClass = isFood ? 'food' : 'workout';
            const valSign = isFood ? '+' : '-';
            const valClass = isFood ? 'food' : 'workout';
            
            logItem.innerHTML = `
                <div class="log-info-box">
                    <div class="log-icon-circle ${iconClass}">
                        <span class="material-symbols-rounded">${icon}</span>
                    </div>
                    <div>
                        <span class="log-name">${escapeHtml(log.name)}</span>
                        <span class="log-time">${log.time}</span>
                    </div>
                </div>
                <div class="log-value-box">
                    <span class="log-val ${valClass}">${valSign}${log.value} ккал</span>
                    <button class="btn-delete-log" data-id="${log.id}">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
            `;
            
            // Delete button binding
            logItem.querySelector(".btn-delete-log").addEventListener("click", () => {
                deleteLog(log.id);
            });
            
            container.appendChild(logItem);
        });
    }
}

function deleteLog(logId) {
    state.dailyLogs = state.dailyLogs.filter(l => l.id !== logId);
    saveStateToStorage();
    updateDashboard();
}

// Populate Quick Presets on opening modal
function populatePresets(type, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    
    PRESETS[type].forEach(p => {
        const chip = document.createElement("div");
        chip.className = `preset-chip ${type}`;
        
        const valueSign = type === 'food' ? '+' : '-';
        chip.innerHTML = `
            <span>${p.name}</span>
            <span class="val">${valueSign}${p.cal} ккал</span>
        `;
        
        chip.addEventListener("click", () => {
            addDailyLog(type, p.name, p.cal);
            // Close modal
            document.getElementById(`modal-add-${type}`).classList.remove("active");
        });
        
        container.appendChild(chip);
    });
}

function addDailyLog(type, name, cal) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newLog = {
        id: Date.now().toString(),
        type: type,
        name: name,
        value: parseInt(cal),
        time: timeStr
    };
    
    state.dailyLogs.push(newLog);
    saveStateToStorage();
    updateDashboard();
}

function saveCustomFood() {
    const nameInput = document.getElementById("food-input-name");
    const calInput = document.getElementById("food-input-cal");
    
    const name = nameInput.value.trim();
    const cal = parseInt(calInput.value);
    
    if (!name || isNaN(cal) || cal <= 0) {
        alert("Введіть правильну назву страви та калорії.");
        return;
    }
    
    addDailyLog('food', name, cal);
    
    // Clear inputs and close
    nameInput.value = "";
    calInput.value = "";
    document.getElementById("modal-add-food").classList.remove("active");
}

function saveCustomWorkout() {
    const nameInput = document.getElementById("workout-input-name");
    const calInput = document.getElementById("workout-input-cal");
    
    const name = nameInput.value.trim();
    const cal = parseInt(calInput.value);
    
    if (!name || isNaN(cal) || cal <= 0) {
        alert("Введіть правильну назву вправи та калорії.");
        return;
    }
    
    addDailyLog('workout', name, cal);
    
    // Check workout in checklists
    state.checklistState.workout = true;
    
    // Clear inputs and close
    nameInput.value = "";
    calInput.value = "";
    document.getElementById("modal-add-workout").classList.remove("active");
}

function saveUpdatedWeight() {
    const weightInput = document.getElementById("weight-input-val");
    const newWeight = parseFloat(weightInput.value);
    
    if (isNaN(newWeight) || newWeight < 30 || newWeight > 250) {
        alert("Введіть правильну вагу (30 - 250 кг).");
        return;
    }
    
    // Update profile
    state.userProfile.weight = newWeight;
    
    // Add to stats weight history
    const today = new Date();
    const dateLabel = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth()+1).toString().padStart(2, '0')}`;
    
    // Check if entry for today already exists in history
    const existingIndex = state.weightHistory.findIndex(h => h.date === dateLabel);
    if (existingIndex !== -1) {
        state.weightHistory[existingIndex].weight = newWeight.toFixed(1);
    } else {
        if (state.weightHistory.length >= 7) {
            state.weightHistory.shift();
        }
        state.weightHistory.push({
            date: dateLabel,
            weight: newWeight.toFixed(1)
        });
    }
    
    saveStateToStorage();
    updateDashboard();
    renderCharts();
    
    document.getElementById("modal-update-weight").classList.remove("active");
}

// ==========================================================================
// GUIDES GENERATOR (Training & Nutrition plans based on Onboarding)
// ==========================================================================
function generateGuides() {
    if (!state.onboardingDone) return;
    
    const goal = state.userProfile.goal;
    const loc = state.userProfile.trainingLocation;
    
    // 1. WORKOUTS GENERATOR
    const workoutPlanTitle = document.getElementById("lbl-workout-plan-title");
    const workoutLocation = document.getElementById("lbl-workout-location");
    const workoutContainer = document.getElementById("workout-days-container");
    
    workoutLocation.innerText = loc === 'home' ? 'Вдома (без обладнання)' : 'У спортзалі';
    
    let workouts = [];
    
    if (goal === 'weight-loss') {
        workoutPlanTitle.innerText = "Жироспалювання та Кардіо-Тонус";
        if (loc === 'home') {
            workouts = [
                {
                    day: 1, name: "Кругове HIIT (Всього тіла)",
                    exercises: [
                        { name: "Берпі (Burpees)", sets: "3 круги / 40 сек", desc: "Інтенсивна кардіо-вправа для всього тіла" },
                        { name: "Присідання з вистрибуванням", sets: "3 круги / 45 сек", desc: "Опрацювання квадрицепсу та сідниць" },
                        { name: "Віджимання від підлоги (коліна/носки)", sets: "3 круги / 12-15 пов", desc: "Грудні м'язи та трицепс" },
                        { name: "Альпініст (Mountain Climbers)", sets: "3 круги / 50 сек", desc: "Динамічний прес та кардіо" },
                        { name: "Планка статична", sets: "3 круги / 60 сек", desc: "Зміцнення м'язів кору та спини" }
                    ]
                },
                {
                    day: 2, name: "Табата (Живіт та Сідниці)",
                    exercises: [
                        { name: "Скручування на прес", sets: "4 круги / 20 сек", desc: "Класична вправа на прямий м'яз живота" },
                        { name: "Сідничний місток", sets: "4 круги / 30 сек", desc: "Формування пружних сідниць" },
                        { name: "Підйоми ніг лежачи", sets: "4 круги / 20 сек", desc: "Опрацювання нижнього пресу" },
                        { name: "Випади назад почергово", sets: "4 круги / 30 сек", desc: "Робота над ногами без навантаження колін" },
                        { name: "Планка спайдермен", sets: "4 круги / 20 сек", desc: "Косі м'язи живота та координація" }
                    ]
                },
                {
                    day: 3, name: "Кардіо-Витривалість",
                    exercises: [
                        { name: "Біг на місці з високим підйомом колін", sets: "3 круги / 60 сек", desc: "Максимальне спалення калорій" },
                        { name: "Стрибки Джека (Jumping Jacks)", sets: "3 круги / 60 сек", desc: "Покращення серцево-судинної системи" },
                        { name: "Віджимання широким хватом", sets: "3 круги / 12 пов", desc: "Зміцнення спини та рук" },
                        { name: "Присідання сумо", sets: "3 круги / 20 пов", desc: "Внутрішня поверхня стегна" },
                        { name: "Бічна планка", sets: "3 круги / 30 сек на бік", desc: "Розвиток міцності бокових ліній кору" }
                    ]
                }
            ];
        } else {
            workouts = [
                {
                    day: 1, name: "Суперсети: Грудні та Спина + Кардіо",
                    exercises: [
                        { name: "Жим гантелей на похилій лаві", sets: "4 сета / 15 пов", desc: "Робота над верхом грудей" },
                        { name: "Тяга верхнього блоку до грудей", sets: "4 сета / 15 пов", desc: "Широкі м'язи спини" },
                        { name: "Жим платформи ногами", sets: "3 сета / 20 пов", desc: "Робота ніг у безпечній амплітуді" },
                        { name: "Зведення гантелей на лаві", sets: "3 сета / 15 пов", desc: "Ізольоване опрацювання грудних" },
                        { name: "Бігова доріжка (Інтервали)", sets: "20 хвилин", desc: "Швидка ходьба під гору, чергування нахилу" }
                    ]
                },
                {
                    day: 2, name: "Низ Тіла (Квадріцепс / Ягодиці)",
                    exercises: [
                        { name: "Присідання зі штангою (легка вага)", sets: "4 сета / 12-15 пов", desc: "Базова вправа для всього низу" },
                        { name: "Румунська тяга з гантелями", sets: "4 сета / 15 пов", desc: "Задня поверхня стегна та сідниці" },
                        { name: "Випади при ходьбі в залі", sets: "3 сета / 20 кроків", desc: "Опрацювання рельєфу ніг" },
                        { name: "Розгинання ніг в тренажері", sets: "3 сета / 15 пов", desc: "Ізоляція передньої частини стегна" },
                        { name: "Орбітрек (Еліпс тренажер)", sets: "25 хвилин", desc: "Плавне кардіо без удару по суглобах" }
                    ]
                },
                {
                    day: 3, name: "Плечі / Руки + Інтенсивний Прес",
                    exercises: [
                        { name: "Жим гантелей сидячи", sets: "3 сета / 15 пов", desc: "Розвиток дельтоподібних м'язів" },
                        { name: "Махи гантелями в сторони", sets: "4 сета / 15 пов", desc: "Округлення середніх дельт" },
                        { name: "Згинання рук з гантелями (Біцепс)", sets: "3 сета / 15 пов", desc: "Красиві руки" },
                        { name: "Розгинання рук на блоці (Трицепс)", sets: "3 сета / 15 пов", desc: "Усунення дряблості рук" },
                        { name: "Підйоми колін у висі на турніку", sets: "3 сета / 15-20 пов", desc: "Королівська вправа на нижній прес" }
                    ]
                }
            ];
        }
    } else if (goal === 'muscle-gain') {
        workoutPlanTitle.innerText = "Гіпертрофія та Сила (Прогресивна)";
        if (loc === 'home') {
            workouts = [
                {
                    day: 1, name: "Тренування А: Push (Груди/Плечі/Трицепс)",
                    exercises: [
                        { name: "Класичні віджимання з паузою внизу", sets: "4 сета / max пов", desc: "Створення об'єму грудей" },
                        { name: "Віджимання куточком (Pike Pushups)", sets: "4 сета / 10-12 пов", desc: "Силове навантаження на плечі" },
                        { name: "Зворотні віджимання від стільця", sets: "4 сета / 15-20 пов", desc: "Акцент на триголовий м'яз рук" },
                        { name: "Віджимання з вузькою постановкою рук", sets: "3 сета / 12 пов", desc: "Спільна робота грудей та трицепсу" },
                        { name: "Статична планка на ліктях", sets: "3 сета / 90 сек", desc: "Супер-стабілізація всього кору" }
                    ]
                },
                {
                    day: 2, name: "Тренування Б: Pull (Спина/Біцепс/Коре)",
                    exercises: [
                        { name: "Підтягування на турніку (за наявності)", sets: "4 сета / 8-12 пов", desc: "Найкраща вправа для ширини спини" },
                        { name: "Тяга еспандера/рушника до живота", sets: "4 сета / 15 пов", desc: "Опрацювання товщини спини" },
                        { name: "Супермен (Підйоми рук і ніг лежачи)", sets: "4 сета / 15 пов", desc: "Укріплення попереку та постави" },
                        { name: "Згинання рук на біцепс з пляшками/резинами", sets: "4 сета / 15 пов", desc: "Ізольоване навантаження біцепсу" },
                        { name: "Бічні скручування лежачи", sets: "3 сета / 20 пов на бік", desc: "Прокачка косих м'язів живота" }
                    ]
                },
                {
                    day: 3, name: "Тренування В: Legs (Низ тіла / Ноги)",
                    exercises: [
                        { name: "Присідання з вистрибуванням", sets: "4 сета / 20 пов", desc: "Потужна стимуляція ніг" },
                        { name: "Болгарські спліт-присідання", sets: "3 сета / 12 пов на ногу", desc: "Глибоке опрацювання сідниць та ніг" },
                        { name: "Випади вперед з вагою в руках", sets: "3 сета / 24 кроки", desc: "Опрацювання ніг при ходьбі" },
                        { name: "Підйоми на носки на одній нозі", sets: "4 сета / 25 пов", desc: "Прокачка литкових м'язів" },
                        { name: "Сідничний місток на одній нозі", sets: "3 сета / 15 пов на ногу", desc: "Робота над ізольованими сідницями" }
                    ]
                }
            ];
        } else {
            workouts = [
                {
                    day: 1, name: "Груди / Трицепс (Power & Pump)",
                    exercises: [
                        { name: "Жим штанги лежачи на горизонтальній лаві", sets: "4 сета / 8-10 пов", desc: "Основна силова вправа для грудей" },
                        { name: "Жим гантелей під кутом 30 градусів", sets: "3 сета / 10-12 пов", desc: "Опрацювання верхнього відділу грудей" },
                        { name: "Розведення гантелей на лаві", sets: "3 сета / 12 пов", desc: "Розтягування м'язових волокон грудей" },
                        { name: "Французький жим зі штангою лежачи", sets: "3 сета / 10 пов", desc: "Масивність та об'єм трицепсу" },
                        { name: "Жим донизу на блоці з канатною рукояттю", sets: "3 сета / 12-15 пов", desc: "Максимальний пампінг трицепсу" }
                    ]
                },
                {
                    day: 2, name: "Спина / Біцепс (Ширина та Товщина)",
                    exercises: [
                        { name: "Станова тяга класична або сумо", sets: "3 сета / 6-8 пов", desc: "Важка базова силова вправа для спини" },
                        { name: "Тяга штанги в нахилі до живота", sets: "4 сета / 8-10 пов", desc: "Опрацювання товщини найширших спини" },
                        { name: "Підтягування з додатковою вагою", sets: "3 сета / max пов", desc: "Розширення плечового поясу" },
                        { name: "Згинання рук зі штангою стоячи (EZ)", sets: "3 сета / 10 пов", desc: "Об'ємна базова вправа для біцепсу" },
                        { name: "Молоткові згинання рук з гантелями", sets: "3 сета / 12 пов", desc: "Опрацювання брахіалісу та передпліччя" }
                    ]
                },
                {
                    day: 3, name: "Ноги / Плечі (Важкий день ніг)",
                    exercises: [
                        { name: "Присідання зі штангою на плечах", sets: "4 сета / 8-10 пов", desc: "Головний будівельник м'язів ніг" },
                        { name: "Румунська тяга зі штангою", sets: "4 сета / 10 пов", desc: "Потужна вправа для біцепсу стегна" },
                        { name: "Армійський жим штанги стоячи", sets: "3 сета / 8-10 пов", desc: "Силовий розвиток передніх дельт плечей" },
                        { name: "Махи гантелями в сторони сидячи", sets: "4 сета / 12-15 пов", desc: "Максимальна ізоляція середньої дельти" },
                        { name: "Махи гантелями в нахилі (задня дельта)", sets: "3 сета / 12-15 пов", desc: "Створення 3D плечей" }
                    ]
                }
            ];
        }
    } else {
        // Maintain or Endurance
        workoutPlanTitle.innerText = "Здоров'я, Тонус та Енергія";
        workoutPlanTitle.innerText = goal === 'endurance' ? "Витривалість та Кардіо-Здоров'я" : "Загальний тонус та Функціональність";
        workouts = [
            {
                day: 1, name: "День 1: Функціональне тренування всього тіла",
                exercises: [
                    { name: "Присідання з підйомом рук вгору", sets: "3 сета / 15 пов", desc: "Покращення мобільності суглобів" },
                    { name: "Віджимання від підлоги середнім хватом", sets: "3 сета / 15 пов", desc: "Тонус рук та грудних м'язів" },
                    { name: "Випади в сторони почергово", sets: "3 сета / 20 пов", desc: "Мобільність та сила бічних м'язових груп" },
                    { name: "Тяга гантелей в упорі планки", sets: "3 сета / 12 пов", desc: "Координація, спина та міцний прес" },
                    { name: "Скручування 'Книга' (V-ups)", sets: "3 сета / 15 пов", desc: "Зміцнення верхнього та нижнього пресу" }
                ]
            },
            {
                day: 2, name: "День 2: Кардіо та Мобільність суглобів",
                exercises: [
                    { name: "Скакалка або Стрибки Джека", sets: "3 сета / 90 сек", desc: "Розігрів та тренування витривалості серця" },
                    { name: "Сідничний місток на одній нозі", sets: "3 сета / 12 пов на ногу", desc: "Акцент на стабілізацію тазу та сідниці" },
                    { name: "Планка з торканням плечей", sets: "3 сета / 20 пов", desc: "Покращення стійкості плечового поясу" },
                    { name: "Мобільність грудного відділу (Кішка-собака)", sets: "2 сета / 15 пов", desc: "Гнучкість хребта та зняття напруги спини" },
                    { name: "Прес 'Мертвий жук' (Deadbug)", sets: "3 сета / 15 пов", desc: "Контроль глибоких м'язів живота та дихання" }
                ]
            },
            {
                day: 3, name: "День 3: Силовий тонус",
                exercises: [
                    { name: "Глибокі присідання (Air Squats)", sets: "4 сета / 20 пов", desc: "Тонус ніг та гарний кровообіг" },
                    { name: "Підтягування або розтягнення резини спиною", sets: "3 сета / 12 пов", desc: "Формування красивої здорової постави" },
                    { name: "Випади назад з винесенням коліна вгору", sets: "3 сета / 12 пов на ногу", desc: "Баланс, сідниці та зміцнення зв'язок" },
                    { name: "Супермен на животі з плаванням рук", sets: "3 сета / 15 пов", desc: "Укріплення попереку після сидячого дня" },
                    { name: "Планка 'Зірка'", sets: "3 сета / 45 сек", desc: "Потужна статична робота всього тіла" }
                ]
            }
        ];
    }
    
    // Inject workouts accordion
    workoutContainer.innerHTML = "";
    workouts.forEach(w => {
        const card = document.createElement("div");
        card.className = "day-card";
        
        let exHtml = "";
        w.exercises.forEach(ex => {
            exHtml += `
                <div class="exercise-item">
                    <div class="ex-details">
                        <h5>${escapeHtml(ex.name)}</h5>
                        <p>${escapeHtml(ex.desc)}</p>
                    </div>
                    <span class="ex-sets">${escapeHtml(ex.sets)}</span>
                </div>
            `;
        });
        
        card.innerHTML = `
            <div class="day-header">
                <div class="day-info">
                    <span class="day-badge">ДЕНЬ ${w.day}</span>
                    <span class="day-name">${escapeHtml(w.name)}</span>
                </div>
                <span class="material-symbols-rounded btn-toggle-day">expand_more</span>
            </div>
            <div class="day-exercises">
                ${exHtml}
            </div>
        `;
        
        // Add expand/collapse event to day card header
        card.querySelector(".day-header").addEventListener("click", () => {
            const isExpanded = card.classList.contains("expanded");
            // Collapse all others
            document.querySelectorAll(".day-card").forEach(dc => dc.classList.remove("expanded"));
            
            if (!isExpanded) {
                card.classList.add("expanded");
            }
        });
        
        workoutContainer.appendChild(card);
    });
    
    // Expand first workout day by default
    if (workoutContainer.firstChild) {
        workoutContainer.firstChild.classList.add("expanded");
    }

    // 2. NUTRITION GENERATOR
    const totalCal = calculateDailyCalories();
    const macros = calculateMacros();
    
    document.getElementById("lbl-nutrition-total-cal").innerText = totalCal;
    document.getElementById("lbl-macro-proteins").innerText = `${macros.proteins}г`;
    document.getElementById("lbl-macro-fats").innerText = `${macros.fats}г`;
    document.getElementById("lbl-macro-carbs").innerText = `${macros.carbs}г`;

    // Dynamic width for progress bars
    const protPercent = Math.round((macros.proteins * 4 / totalCal) * 100);
    const fatPercent = Math.round((macros.fats * 9 / totalCal) * 100);
    const carbPercent = Math.round((macros.carbs * 4 / totalCal) * 100);
    
    document.getElementById("bar-proteins").style.width = `${protPercent}%`;
    document.getElementById("bar-fats").style.width = `${fatPercent}%`;
    document.getElementById("bar-carbs").style.width = `${carbPercent}%`;

    const nutritionPlanTitle = document.getElementById("lbl-nutrition-plan-title");
    const mealsContainer = document.getElementById("meals-list-container");
    
    let meals = [];
    
    if (goal === 'weight-loss') {
        nutritionPlanTitle.innerText = "Збалансований дефіцит для схуднення";
        meals = [
            {
                type: "Сніданок",
                cal: Math.round(totalCal * 0.25),
                name: "Омлет із зеленню та цільнозерновий тост",
                desc: "3 яйця (1 жовток, 3 білка), 30г шпинату, 1 тост з цільнозернового хліба, 50г авокадо. Багате джерело клітковини та корисних жирів."
            },
            {
                type: "Обід",
                cal: Math.round(totalCal * 0.35),
                name: "Ніжне куряче філе з гречкою та овочами",
                desc: "150г запеченого курячого філе, 60г сухої гречки (відварити), 150г салату з огірків, помідорів та 1 ч.л. оливкової олії. Збалансоване паливо на день."
            },
            {
                type: "Перекуска",
                cal: Math.round(totalCal * 0.15),
                name: "Грецький йогурт з ягодами",
                desc: "150г натурального грецького йогурту 2%, 50г свіжої чорниці або полуниці, 10г гарбузового насіння. Легкий білковий перекус."
            },
            {
                type: "Вечеря",
                cal: Math.round(totalCal * 0.25),
                name: "Запечений білий хек з капустяним салатом",
                desc: "180г філе хека або минтая на пару, 200г свіжої молодої капусти та кропу із заправкою лимонним соком. Легка вечеря для гарного сну."
            }
        ];
    } else if (goal === 'muscle-gain') {
        nutritionPlanTitle.innerText = "Профіцит для набору якісної м'язової маси";
        meals = [
            {
                type: "Сніданок",
                cal: Math.round(totalCal * 0.28),
                name: "Богатирська вівсянка з арахісовою пастою",
                desc: "80г вівсяних пластівців на молоці, 1 цілий банан, 1 ст.л. арахісової пасти, 2 варені яйця окремо. Забезпечує тривалий анаболічний стан."
            },
            {
                type: "Обід",
                cal: Math.round(totalCal * 0.35),
                name: "Яловичий стейк з рисом басматі та броколі",
                desc: "150г нежирної яловичини на грилі, 80г рису басматі, 100г відвареної броколі, 1 ст.л. оливкової олії. Складні вуглеводи та креатин для сили."
            },
            {
                type: "Перекуска",
                cal: Math.round(totalCal * 0.15),
                name: "Сирна запіканка з медом та горіхами",
                desc: "150г сиру кисломолочного 5%, 1 ст.л. рідкого меду, 20г волоських горіхів. Повільний білок казеїн для підтримки м'язів."
            },
            {
                type: "Вечеря",
                cal: Math.round(totalCal * 0.22),
                name: "Запечений червоний лосось з бататом",
                desc: "140г червоної риби (лосось/форель) у фользі, 150г запеченого батату (солодка картопля), спаржа або зелена квасоля. Омега-3 для відновлення."
            }
        ];
    } else {
        // Maintain / Endurance
        nutritionPlanTitle.innerText = "Збалансоване харчування для енергії";
        meals = [
            {
                type: "Сніданок",
                cal: Math.round(totalCal * 0.25),
                name: "Скрембл-тост з слабосолоною сьомгою",
                desc: "2 курячі яйця, 40г слабосолоної риби, 1 скибочка житнього хліба, листя салату, кава з молоком без цукру."
            },
            {
                type: "Обід",
                cal: Math.round(totalCal * 0.35),
                name: "Паста з морепродуктами в томатному соусі",
                desc: "70г твердих сортів пасти (сухої), 120г коктейлю з морепродуктів (креветки, кальмари), соус з томатів пелаті, базилік та пармезан."
            },
            {
                type: "Перекуска",
                cal: Math.round(totalCal * 0.15),
                name: "Сендвіч з індичкою та сиром",
                desc: "Цільнозерновий хлібець, 40г запеченого філе індички, скибочка сиру моцарела, лист салату, помідор."
            },
            {
                type: "Вечеря",
                cal: Math.round(totalCal * 0.25),
                name: "Курячі парові котлети з печеними овочами",
                desc: "150г парових котлет з філе індички чи курки, 200г печених кабачків, баклажанів та перцю з травами."
            }
        ];
    }
    
    // Inject meals
    mealsContainer.innerHTML = "";
    meals.forEach(m => {
        const mCard = document.createElement("div");
        mCard.className = "meal-card";
        
        mCard.innerHTML = `
            <div class="meal-header-flex">
                <span class="meal-badge">${escapeHtml(m.type)}</span>
                <span class="meal-cal">${m.cal} ккал</span>
            </div>
            <h4 class="meal-name">${escapeHtml(m.name)}</h4>
            <p class="meal-desc">${escapeHtml(m.desc)}</p>
        `;
        
        mealsContainer.appendChild(mCard);
    });
}

// ==========================================================================
// SIMULATED AI COACH (CHAT VIEW LOGIC)
// ==========================================================================
function initAICoachChat() {
    const chatContainer = document.getElementById("chat-messages-container");
    chatContainer.innerHTML = "";
    
    const userName = state.userProfile.name;
    const goal = state.userProfile.goal;
    
    let welcomeText = "";
    
    if (goal === 'weight-loss') {
        welcomeText = `Привіт, ${userName}! 👋 Я твій персональний ШІ-тренер. Я вже проаналізував твою анкету та склав для тебе чудовий план для схуднення з лімітом у <b>${calculateDailyCalories()} ккал</b>. Готовий розпочати шлях до стрункості та здоров'я? Запитай мене про тренування або пораду щодо страв на сьогодні!`;
    } else if (goal === 'muscle-gain') {
        welcomeText = `Вітаю, ${userName}! 💪 Я твій ШІ-наставник. Наша ціль — побудувати потужні, міцні м'язи. Я розрахував для тебе профіцитний раціон на <b>${calculateDailyCalories()} ккал</b> з високим вмістом білків. Будемо тренуватися важко та рости! Запитуй будь-які питання про техніку вправ або спортивні добавки.`;
    } else {
        welcomeText = `Привіт, ${userName}! 🌟 Я твій персональний коуч. Твій план підтримки форми розрахований на <b>${calculateDailyCalories()} ккал</b> на день. Ми зосередимося на функціональності, гнучкості та здоровому серці. Запитай мене, як зробити твій день більш активним або яку страву обрати на обід!`;
    }
    
    addChatMessage('coach', welcomeText);
    populateQuickSuggestions();
}

function addChatMessage(sender, text) {
    const chatContainer = document.getElementById("chat-messages-container");
    const msg = document.createElement("div");
    msg.className = `message ${sender}`;
    msg.innerHTML = text; // Permitted because we build internal text safe
    chatContainer.appendChild(msg);
    
    // Save to history
    state.chatHistory.push({
        sender: sender,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    saveStateToStorage();
    
    // Auto scroll
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function populateQuickSuggestions() {
    const container = document.getElementById("chat-quick-suggestions");
    container.innerHTML = "";
    
    const goal = state.userProfile.goal;
    let prompts = [];
    
    if (goal === 'weight-loss') {
        prompts = [
            "Які вправи найкращі для спалювання жиру? 🔥",
            "Склади мені швидкий білковий перекус 🥗",
            "Як позбутися тяги до солодкого? 🍩",
            "У мене немає мотивації сьогодні... 😢"
        ];
    } else if (goal === 'muscle-gain') {
        prompts = [
            "План силового тренування на 20 хвилин 💪",
            "Скільки білка мені потрібно споживати? 🍗",
            "Як прискорити відновлення м'язів? 🛌",
            "Яка добавка креатину найкраща? 🧪"
        ];
    } else {
        prompts = [
            "Розкажи про важливість питного режиму 💧",
            "Коротка суглобова розминка на ранок 🤸‍♂️",
            "Здоровий рецепт швидкої вечері 🍳",
            "Як підтримувати тонус в офісі? 🪑"
        ];
    }
    
    prompts.forEach(pText => {
        const btn = document.createElement("button");
        btn.className = "btn-suggestion";
        btn.innerText = pText;
        btn.addEventListener("click", () => {
            sendUserQuery(pText);
        });
        container.appendChild(btn);
    });
}

function handleUserMessage() {
    const input = document.getElementById("chat-input");
    const query = input.value.trim();
    if (!query) return;
    
    input.value = "";
    sendUserQuery(query);
}

function sendUserQuery(text) {
    addChatMessage('user', escapeHtml(text));
    showTypingIndicator();
    
    // Generate AI response after small delay to mimic real computation
    setTimeout(() => {
        hideTypingIndicator();
        const aiResponse = generateSimulatedAIResponse(text);
        addChatMessage('coach', aiResponse);
    }, 1200 + Math.random() * 800);
}

function showTypingIndicator() {
    const chatContainer = document.getElementById("chat-messages-container");
    
    // Check if already exists
    if (document.getElementById("typing-indicator-node")) return;
    
    const indicator = document.createElement("div");
    indicator.className = "typing-indicator";
    indicator.id = "typing-indicator-node";
    indicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    
    chatContainer.appendChild(indicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function hideTypingIndicator() {
    const node = document.getElementById("typing-indicator-node");
    if (node) node.remove();
}

// SIMULATED AI NLP MATCHING DICTIONARY
function generateSimulatedAIResponse(userText) {
    const text = userText.toLowerCase();
    const name = state.userProfile.name;
    const goal = state.userProfile.goal;
    const loc = state.userProfile.trainingLocation;
    
    // Greetings
    if (text.includes("привіт") || text.includes("добрий день") || text.includes("вітаю") || text.includes("привет")) {
        return `Привіт, ${name}! Радий тебе чути знову. Які питання тебе сьогодні цікавлять? Можемо обговорити твої калорії або тренувальний план!`;
    }
    
    // Water
    if (text.includes("вод") || text.includes("пит")) {
        return `Вода — це ключ до твого метаболізму, ${name}. Тобі рекомендується випивати щонайменше <b>2 літри чистої води на день</b>. Це допомагає прискорити спалювання жиру, покращує роботу м'язів та суглобів і зменшує відчуття псевдо-голоду! 💧 Спробуй випивати склянку води щогодини.`;
    }
    
    // Sweat sweet cravings / Hunger
    if (text.includes("солодк") || text.includes("цукор") || text.includes("тяга")) {
        return `Тяга до солодкого зазвичай виникає через дефіцит складних вуглеводів або хрому в раціоні, а також через психологічний стрес. 🍫 <b>Мій лайфхак для тебе, ${name}:</b><br>1. Додай більше каш (гречка, вівсянка) на обід.<br>2. Заміни солодощі фруктами з горіхами.<br>3. Переконайся, що з'їдаєш норму білка — він чудово стабілізує цукор в крові.`;
    }
    
    // Low motivation
    if (text.includes("мотивац") || text.includes("лінь") || text.includes("втомив") || text.includes("не хочу")) {
        return `Я тебе чудово розумію, ${name}. Кожен з нас має дні, коли опускаються руки. Але пам'ятай: <b>найважче — це зробити перший крок</b>. Не обов'язково робити повне тренування сьогодні. Домовся з собою зробити лише 5 хвилин розминки. Найчастіше, після цього тіло прокидається і ти робиш повноцінне заняття! Зробимо хоча б 10 присідань прямо зараз? 💪`;
    }

    // Gym or Home workouts
    if (text.includes("вправ") || text.includes("тренуван") || text.includes("фітнес") || text.includes("кардіо")) {
        if (goal === 'weight-loss') {
            return `Оскільки наша головна мета — схуднення, найкраще поєднувати силові кругові вправи з помірним кардіо. Твій план вкладок <b>"Гайди"</b> містить саме такі вправи для умов: <b>"${loc === 'home' ? 'Вдома' : 'Зал'}"</b>. Вони прискорюють пульс та змушують тіло спалювати жир навіть протягом 24 годин після тренування. Хочеш пораджу швидку вправу на прес?`;
        } else if (goal === 'muscle-gain') {
            return `Для набору якісної м'язової маси нам потрібен <b>прогрес навантаження</b>. Тобто ти маєш поступово збільшувати вагу снарядів або кількість повторень. Обов'язково роби паузу між важкими сетами по 2-3 хвилини для відновлення АТФ в м'язах. Роби вправи підконтрольно, відчуваючи кожне волокно!`;
        } else {
            return `Для загального тонусу найкраще підходять функціональні тренування, які задіюють глибокі м'язи-стабілізатори та покращують координацію. Спробуй робити вправи з власною вагою (планки, випади, скручування) з повним контролем дихання.`;
        }
    }
    
    // Protein and macros
    if (text.includes("білок") || text.includes("протеїн") || text.includes("бжв")) {
        const macros = calculateMacros();
        return `Твоя індивідуальна норма білка — близько <b>${macros.proteins} грамів на добу</b>. Білок — це будівельний матеріал для м'язів (особливо при наборі маси) та чудовий фактор ситості (при схудненні). 🥚 <b>Найкращі джерела білка:</b> куряче філе, індичка, яйця, біла риба, сир кисломолочний 5%, сочевиця та бобові. Додавай білок у кожен основний прийом їжі!`;
    }
    
    // Snacks
    if (text.includes("перекус") || text.includes("з'їсти")) {
        return `Ось тобі 3 варіанти чудового корисного перекусу від ШІ-шефа на ~200 ккал: <br><br>
        1. <b>Фітнес-тост:</b> Цільнозерновий хлібець + 30г авокадо + 30г слабосолоної риби. (Корисні жири Omega-3).<br>
        2. <b>Солодкий, але корисний:</b> 1 середнє яблуко (порізати дольками) + 1 ч.л. арахісової або мигдалевої пасти.<br>
        3. <b>Супер-білок:</b> 150г натурального білого йогурту 2% + жменя ягід полуниці/лохини.`;
    }
    
    // Pre-workout meal
    if (text.includes("перед тренуванням") || text.includes("до тренування")) {
        return `Перед тренуванням тілу потрібна легка та швидка енергія. Найкраще з'їсти <b>складні вуглеводи з невеликою кількістю білка за 1.5 - 2 години</b> до занять. Наприклад: банан з кількома горіхами або вівсянка. Це дасть тобі колосальний запас витривалості! 🍌 Не тренуйся на повний шлунок або занадто голодним.`;
    }
    
    // Calories specific queries
    if (text.includes("калорі") || text.includes("норма")) {
        const cal = calculateDailyCalories();
        return `Я розрахував твою добову норму — вона становить <b>${cal} ккал</b>. Щоб бачити стійкий результат, намагайся записувати все, що споживаєш протягом дня, у наш зручний <b>трекер на головній сторінці</b>. Навіть маленька кава з молоком має значення! 😉`;
    }

    // Default fallback responses with dynamic custom content
    return `Чудове питання, ${name}! Зі свого боку я раджу завжди тримати фокус на твоїй головній цілі — <b>${goal === 'weight-loss' ? 'схуднення' : goal === 'muscle-gain' ? 'набір м'язової маси' : 'підтримка форми'}</b>. Для цього намагайся дотримуватися встановлених лімітів калорій (${calculateDailyCalories()} ккал) та виконувати призначені фізичні активності. Чи можу я допомогти тобі з чимось ще?`;
}

// Helper to escape user input to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// ==========================================================================
// STATISTICS & VISUAL CHART ENGINE (Clean Canvas / SVG Drawing)
// ==========================================================================
function renderCharts() {
    if (!state.onboardingDone) return;
    
    renderWeightChart();
    renderCaloriesChart();
    
    // Update Stats text summary boxes
    const avgCal = state.calorieHistory.length > 0 
        ? Math.round(state.calorieHistory.reduce((sum, h) => sum + h.eaten, 0) / state.calorieHistory.length)
        : 0;
    
    document.getElementById("lbl-stats-avg-cal").innerText = `${avgCal} ккал`;
    
    // Calculate total weight change
    if (state.weightHistory.length >= 2) {
        const startW = parseFloat(state.weightHistory[0].weight);
        const currentW = parseFloat(state.weightHistory[state.weightHistory.length - 1].weight);
        const diff = (currentW - startW).toFixed(1);
        const sign = diff > 0 ? "+" : "";
        document.getElementById("lbl-stats-weight-change").innerText = `${sign}${diff} кг`;
    } else {
        document.getElementById("lbl-stats-weight-change").innerText = "0 кг";
    }
}

// Weight chart - SVG Line Chart with Gradient Fill
function renderWeightChart() {
    const container = document.getElementById("weight-chart-container");
    container.innerHTML = "";
    
    const history = state.weightHistory;
    if (history.length === 0) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    const padding = 25;
    
    // Find min and max weight for scaling
    const weights = history.map(h => parseFloat(h.weight));
    let minW = Math.min(...weights) - 0.5;
    let maxW = Math.max(...weights) + 0.5;
    
    // Handle edge case of single weight or equal weights
    if (minW === maxW) {
        minW -= 2;
        maxW += 2;
    }
    
    const numPoints = history.length;
    const xStep = (width - padding * 2) / (numPoints - 1 || 1);
    
    // Calculate coordinates for points
    const points = [];
    for (let i = 0; i < numPoints; i++) {
        const x = padding + i * xStep;
        const wVal = parseFloat(history[i].weight);
        const y = height - padding - ((wVal - minW) / (maxW - minW)) * (height - padding * 2);
        points.push({ x, y, val: wVal, date: history[i].date });
    }
    
    // Start generating SVG elements
    let svgContent = `
        <svg class="chart-svg" width="100%" height="100%">
            <!-- Defs for Gradient Fill and drop shadow -->
            <defs>
                <linearGradient id="blue-gradient-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.25" />
                    <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.00" />
                </linearGradient>
            </defs>
            
            <!-- Grid Lines -->
            <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" class="chart-grid-line" />
            <line x1="${padding}" y1="${(height - padding * 2) / 2 + padding}" x2="${width - padding}" y2="${(height - padding * 2) / 2 + padding}" class="chart-grid-line" />
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" class="chart-axis-line" />
    `;
    
    // Draw area path (filled gradient under line)
    if (numPoints > 1) {
        let areaPath = `M ${points[0].x} ${height - padding} `;
        points.forEach(p => {
            areaPath += `L ${p.x} ${p.y} `;
        });
        areaPath += `L ${points[points.length - 1].x} ${height - padding} Z`;
        svgContent += `<path d="${areaPath}" class="chart-area-fill" />`;
        
        // Draw line path
        let linePath = `M ${points[0].x} ${points[0].y} `;
        for (let i = 1; i < numPoints; i++) {
            linePath += `L ${points[i].x} ${points[i].y} `;
        }
        svgContent += `<path d="${linePath}" class="chart-line" />`;
    }
    
    // Draw points & values & date labels
    points.forEach(p => {
        // Point circle
        svgContent += `<circle cx="${p.x}" cy="${p.y}" class="chart-point" />`;
        // Value text
        svgContent += `<text x="${p.x}" y="${p.y - 10}" text-anchor="middle" class="chart-text" fill="white" font-weight="600">${p.val}кг</text>`;
        // Date text
        svgContent += `<text x="${p.x}" y="${height - 8}" text-anchor="middle" class="chart-text">${p.date}</text>`;
    });
    
    svgContent += `</svg>`;
    container.innerHTML = svgContent;
}

// Calories chart - SVG Bar Chart (Last 7 days)
function renderCaloriesChart() {
    const container = document.getElementById("calories-chart-container");
    container.innerHTML = "";
    
    const history = [...state.calorieHistory];
    
    // Proactively push today's calories so it renders live
    const today = new Date();
    const todayLabel = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth()+1).toString().padStart(2, '0')}`;
    const todayEaten = state.dailyLogs
        .filter(l => l.type === 'food')
        .reduce((sum, l) => sum + l.value, 0);
    const todayGoal = calculateDailyCalories();
    
    // If today is already in history, update it, otherwise push it temporary
    const existingIndex = history.findIndex(h => h.date === todayLabel);
    if (existingIndex !== -1) {
        history[existingIndex].eaten = todayEaten;
        history[existingIndex].goal = todayGoal;
    } else {
        if (history.length >= 7) {
            history.shift();
        }
        history.push({
            date: todayLabel,
            eaten: todayEaten,
            goal: todayGoal
        });
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    const padding = 20;
    const bottomPadding = 25;
    
    // Max eaten value for scale
    const eatens = history.map(h => h.eaten);
    const goals = history.map(h => h.goal);
    let maxVal = Math.max(...eatens, ...goals, 1500) + 200;
    
    const numBars = history.length;
    const barSpacing = (width - padding * 2) / numBars;
    const barWidth = Math.max(barSpacing * 0.5, 12);
    
    let svgContent = `
        <svg class="chart-svg" width="100%" height="100%">
            <!-- X Axis Line -->
            <line x1="${padding}" y1="${height - bottomPadding}" x2="${width - padding}" y2="${height - bottomPadding}" class="chart-axis-line" />
    `;
    
    for (let i = 0; i < numBars; i++) {
        const h = history[i];
        const x = padding + i * barSpacing + (barSpacing - barWidth) / 2;
        
        // Calculate heights
        const barHeight = ((h.eaten) / maxVal) * (height - padding - bottomPadding);
        const y = height - bottomPadding - barHeight;
        
        // Calorie Goal line inside bar card as visual guide
        const goalY = height - bottomPadding - ((h.goal) / maxVal) * (height - padding - bottomPadding);
        
        // Determine bar color (rose if exceeded goal)
        const isExceeded = h.eaten > h.goal;
        const color = isExceeded ? 'var(--color-rose)' : 'var(--color-emerald)';
        
        svgContent += `
            <!-- Goal Line indicator behind bar -->
            <line x1="${x - 4}" y1="${goalY}" x2="${x + barWidth + 4}" y2="${goalY}" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-dasharray="2 2" />
            
            <!-- Real Eaten Bar -->
            <rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(barHeight, 4)}" fill="${color}" rx="4" />
            
            <!-- Value text -->
            <text x="${x + barWidth / 2}" y="${Math.max(y - 6, 12)}" text-anchor="middle" class="chart-text" fill="white">${h.eaten}</text>
            
            <!-- Date Label -->
            <text x="${x + barWidth / 2}" y="${height - 8}" text-anchor="middle" class="chart-text">${h.date}</text>
        `;
    }
    
    svgContent += `</svg>`;
    container.innerHTML = svgContent;
}
