/**
 * Guides & Active Workout Player Module
 * Builds personalized exercise drills and recipes, managing the interactive overlay player.
 */

(function() {
    // DOM Cache
    const tabWorkout = document.getElementById('tab-guide-workout');
    const tabNutrition = document.getElementById('tab-guide-nutrition');
    const secWorkout = document.getElementById('guide-section-workout');
    const secNutrition = document.getElementById('guide-section-nutrition');

    const programTitle = document.getElementById('workout-program-title');
    const programDesc = document.getElementById('workout-program-desc');
    const workoutsContainer = document.getElementById('workouts-list-container');
    const dietContainer = document.getElementById('diet-list-container');

    // Workout Player Overlay Cache
    const playerContainer = document.getElementById('workout-player-container');
    const playerCloseBtn = document.getElementById('btn-quit-workout');
    const playerTitle = document.getElementById('w-player-title');
    const exTitle = document.getElementById('ex-title');
    const exDescription = document.getElementById('ex-description');
    const exTargetReps = document.getElementById('ex-target-reps');
    const exAvatar = document.getElementById('ex-avatar');
    
    // Timer
    const timerDisplay = document.getElementById('workout-timer-display');
    const btnTimerToggle = document.getElementById('btn-timer-toggle');
    const btnExPrev = document.getElementById('btn-ex-prev');
    const btnExNext = document.getElementById('btn-ex-next');
    const dotsRow = document.getElementById('workout-progress-dots-row');

    // Data Store inside module
    let activeWorkoutData = null;
    let activeExerciseIdx = 0;
    let timerInterval = null;
    let timerSeconds = 0;
    let isTimerRunning = false;

    // Database of personalized plans in Ukrainian
    const plansDb = {
        lose: {
            title: 'Програма: Жироспалення & HIIT',
            desc: 'Інтенсивні інтервальні комплекси для прискорення обміну речовин та сушки.',
            workouts: [
                {
                    name: 'HIIT Прес & Кардіо',
                    difficulty: 'Середня',
                    diffClass: 'difficulty-easy',
                    duration: '15 хв',
                    kcal: '180 ккал',
                    icon: '🔥',
                    exercises: [
                        { name: 'Стрибки Джеки (Jumping Jacks)', desc: 'Енергійно стрибайте, розводячи руки та ноги в сторони. Тримайте дихання рівномірним.', reps: '3 підходи х 45 сек', avatar: '🏃' },
                        { name: 'Берпі без віджимань', desc: 'Присядьте, вистрибніть ногами назад у упор лежачи, поверніться в присідання і підстрибніть вгору.', reps: '3 підходи х 10 разів', avatar: '⚡' },
                        { name: 'Велосипед на прес', desc: 'Лежачи на спині, почергово підтягуйте лікоть до протилежного коліна, імітуючи їзду.', reps: '3 підходи х 20 разів', avatar: '🚴' },
                        { name: 'Класична планка', desc: 'Спирайтесь на передпліччя та носки. Утримуйте тіло в ідеальній прямій лінії.', reps: '3 підходи х 45 сек', avatar: '🧘' }
                    ]
                },
                {
                    name: 'Кругове домашнє тренування',
                    difficulty: 'Важка',
                    diffClass: 'difficulty-hard',
                    duration: '22 хв',
                    kcal: '250 ккал',
                    icon: '🤸‍♀️',
                    exercises: [
                        { name: 'Присідання з вистрибуванням', desc: 'Присядьте до паралелі, а потім потужно вистрибніть вгору, м\'яко приземляючись.', reps: '4 підходи х 12 разів', avatar: '💥' },
                        { name: 'Віджимання з колін', desc: 'Утримуйте спину рівною. Опускайтесь грудьми майже до підлоги і піднімайтесь вгору.', reps: '4 підходи х 10 разів', avatar: '💪' },
                        { name: 'Альпініст (Mountain Climbers)', desc: 'В упорі лежачи почергово швидко підтягуйте коліна до грудей.', reps: '4 підходи х 30 сек', avatar: '⛰️' },
                        { name: 'Сідничний місток', desc: 'Лежачи на спині, підніміть таз вгору, стискаючи сідниці у верхній точці.', reps: '3 підходи х 20 разів', avatar: '🍑' }
                    ]
                }
            ],
            diet: [
                { type: 'Сніданок 🍳', name: 'Вівсяна каша з ягодами', cal: 320, p: 10, c: 55, f: 6, desc: 'Вівсяні пластівці (70г) відварити на воді, додати 50г свіжих ягід та 10г мигдалю.' },
                { type: 'Обід 🍗', name: 'Салат з курячим філе та кіноа', cal: 410, p: 38, c: 35, f: 12, desc: '150г вареного філе, 60г кіноа, свіжий огірок, томати чері, зелень та 1 ч.л. оливкової олії.' },
                { type: 'Полуденок 🥛', name: 'Протеїновий шейк або банан', cal: 150, p: 25, c: 15, f: 1.5, desc: '1 порція ізоляту сироваткового протеїну змішати з водою або 200мл знежиреного молока.' },
                { type: 'Вечеря 🥗', name: 'Хек запечений із броколі', cal: 260, p: 28, c: 8, f: 7, desc: '180г філе хека запекти у фользі зі спеціями, подавати з відвареною броколі (150г).' }
            ]
        },
        build: {
            title: 'Програма: Силовий Профіцит',
            desc: 'Силові протоколи з власною вагою та акцентом на прогресуюче навантаження для росту м\'язів.',
            workouts: [
                {
                    name: 'Силовий Верх Корпусу',
                    difficulty: 'Важка',
                    diffClass: 'difficulty-hard',
                    duration: '25 хв',
                    kcal: '210 ккал',
                    icon: '💪',
                    exercises: [
                        { name: 'Широкі віджимання', desc: 'Поставте руки ширше плечей. Повільно опускайтесь вниз на 3 рахунки, вибухово піднімайтесь.', reps: '4 підходи х 12 разів', avatar: '🏋️' },
                        { name: 'Зворотні віджимання від стільця', desc: 'Спираючись руками на стілець ззаду, опускайте таз вниз, згинаючи лікті до 90 градусів.', reps: '4 підходи х 12 разів', avatar: '🪑' },
                        { name: 'Супермен (Лопатки)', desc: 'Лежачи на животі, підніміть груди та руки вгору, зводячи лопатки разом.', reps: '3 підходи х 15 разів', avatar: '🦅' },
                        { name: 'Алмазні віджимання', desc: 'Поставте руки близько, утворивши алмаз великими та вказівними пальцями. Акцент на трицепс.', reps: '3 підходи х 8 разів', avatar: '💎' }
                    ]
                },
                {
                    name: 'Сталева Сила Ніг',
                    difficulty: 'Важка',
                    diffClass: 'difficulty-hard',
                    duration: '20 хв',
                    kcal: '230 ккал',
                    icon: '🦵',
                    exercises: [
                        { name: 'Болгарські випади', desc: 'Поставте одну ногу ззаду на підвищення (диван). Присідайте на опорній нозі глибоко.', reps: '3 підходи х 12 разів на ногу', avatar: '🪜' },
                        { name: 'Глибокі присідання', desc: 'Присідайте максимально низько, утримуючи рівну спину та не відриваючи п\'яти.', reps: '4 підходи х 15 разів', avatar: '🏋️‍♀️' },
                        { name: 'Підйоми на носки', desc: 'Повільно піднімайтесь на носки, затримуючись у верхній точці на 2 секунди.', reps: '3 підходи х 25 разів', avatar: '🧍' },
                        { name: 'Статичне утримання "Стілець"', desc: 'Притисніть спину до стіни, зігніть ноги під кутом 90 градусів і утримуйте положення.', reps: '3 підходи х 45 сек', avatar: '🧱' }
                    ]
                }
            ],
            diet: [
                { type: 'Сніданок 🍳', name: 'Омлет з 3 яєць та цільнозерновий хліб', cal: 480, p: 26, c: 38, f: 18, desc: 'Приготувати омлет із помідорами та сиром (30г), подавати з 2 шматочками тосту.' },
                { type: 'Обід 🍗', name: 'Яловичина тушкована з гречкою', cal: 620, p: 45, c: 68, f: 14, desc: '150г нежирної яловичини зтушкувати, подавати з відвареною гречкою (200г) та овочами.' },
                { type: 'Полуденок 🥛', name: 'Сирний мус із бананом та горіхами', cal: 380, p: 30, c: 45, f: 10, desc: 'Збити блендером 150г сиру 5%, 1 великий банан та 20г грецьких горіхів.' },
                { type: 'Вечеря 🥗', name: 'Запечений лосось з диким рисом', cal: 510, p: 35, c: 42, f: 20, desc: '150г філе лосося запекти з травами, подати з відвареним чорним/диким рисом (150г).' }
            ]
        },
        maintain: {
            title: 'Програма: Життєвий Тонус',
            desc: 'Збалансовані тренування для підтримки м\'язового корсету, гнучкості та здоров\'я серця.',
            workouts: [
                {
                    name: 'Ранкова Зарядка / Тонус',
                    difficulty: 'Легка',
                    diffClass: 'difficulty-easy',
                    duration: '12 хв',
                    kcal: '100 ккал',
                    icon: '☀️',
                    exercises: [
                        { name: 'Обертання суглобів', desc: 'Виконайте плавні обертання шиєю, плечима, тазом та колінами для розігріву.', reps: '1 підхід х 3 хв', avatar: '🔄' },
                        { name: 'Присідання класичні', desc: 'Присідайте плавно, тримаючи руки перед собою для балансу.', reps: '3 підходи х 12 разів', avatar: '🤸' },
                        { name: 'Кішка-Корова (Спина)', desc: 'Стоячи на четвереньках почергово прогинайте та вигинайте спину, дихаючи глибоко.', reps: '2 підходи х 15 разів', avatar: '🐈' },
                        { name: 'Розтяжка кобра', desc: 'Лежачи на животі випряміть руки і підніміть корпус вгору, витягуючи хребет.', reps: '2 підходи х 30 сек', avatar: '🐍' }
                    ]
                },
                {
                    name: 'Міцний Корсет & Прес',
                    difficulty: 'Середня',
                    diffClass: 'difficulty-easy',
                    duration: '18 хв',
                    kcal: '150 ккал',
                    icon: '🛡️',
                    exercises: [
                        { name: 'Скручування на прес', desc: 'Лежачи на спині піднімайте тільки лопатки, концентруючись на стисканні м\'язів пресу.', reps: '3 підходи х 15 разів', avatar: '🧘‍♂️' },
                        { name: 'Мисливський собака (Bird Dog)', desc: 'На четвереньках почергово випрямляйте протилежну руку та ногу паралельно підлозі.', reps: '3 підходи х 12 разів', avatar: '🐕' },
                        { name: 'Бічна планка (почергово)', desc: 'Утримуйте баланс на одному лікті та бічній поверхні стопи. Корпус рівний.', reps: '2 підходи х 30 сек на бік', avatar: '🛡️' },
                        { name: 'Підйоми ніг лежачи', desc: 'Повільно піднімайте рівні ноги вгору до кута 90 градусів, не відриваючи поперек.', reps: '3 підходи х 12 разів', avatar: '🦵' }
                    ]
                }
            ],
            diet: [
                { type: 'Сніданок 🍳', name: 'Яєчня з овочами та сиром', cal: 390, p: 20, c: 15, f: 16, desc: 'Яєчня з 2 яєць, помідори, болгарський перць, посипати сиром фета (20г).' },
                { type: 'Обід 🍗', name: 'Паста з індичкою в томатному соусі', cal: 520, p: 36, c: 60, f: 10, desc: 'Паста твердих сортів (80г сухої), 120г фаршу індички з томатною пастою та зеленню.' },
                { type: 'Полуденок 🥛', name: 'Яблуко та жменя волоських горіхів', cal: 210, p: 4, c: 24, f: 12, desc: 'Одне велике яблуко солодких сортів та 25г підсушених горіхів.' },
                { type: 'Вечеря 🥗', name: 'Запечений хек із салатом табуле', cal: 360, p: 30, c: 22, f: 10, desc: '150г запеченого хека, салат із кускусу, томатів, петрушки та оливкової олії.' }
            ]
        }
    };

    function init() {
        if (!window.FitState.data.isOnboarded) return;

        // Navigation Toggles
        tabWorkout.onclick = () => {
            tabWorkout.classList.add('active');
            tabNutrition.classList.remove('active');
            secWorkout.classList.add('active');
            secNutrition.classList.remove('active');
        };

        tabNutrition.onclick = () => {
            tabNutrition.classList.add('active');
            tabWorkout.classList.remove('active');
            secNutrition.classList.add('active');
            secWorkout.classList.remove('active');
        };

        // Render dynamic plans matching onboarding goal
        renderPersonalizedPlans();

        // Player Event Handlers
        playerCloseBtn.onclick = quitActiveWorkout;
        btnTimerToggle.onclick = toggleTimer;
        btnExPrev.onclick = goPrevExercise;
        btnExNext.onclick = goNextExercise;
    }

    function renderPersonalizedPlans() {
        const state = window.FitState.data;
        const goal = state.user.goal;
        const data = plansDb[goal] || plansDb.maintain;

        programTitle.innerText = data.title;
        programDesc.innerText = data.desc;

        // 1. Render Workouts List
        workoutsContainer.innerHTML = '';
        data.workouts.forEach((w, wIdx) => {
            const card = document.createElement('div');
            card.className = 'workout-card';
            card.innerHTML = `
                <div class="w-card-header">
                    <div class="w-card-title">
                        <h4>${w.icon} ${w.name}</h4>
                        <span class="w-card-tag ${w.diffClass}">Складність: ${w.difficulty}</span>
                    </div>
                </div>
                <div class="w-card-specs">
                    <div class="spec-bubble">⏱️ ${w.duration}</div>
                    <div class="spec-bubble">🔥 ${w.kcal}</div>
                    <div class="spec-bubble">🏋️ ${w.exercises.length} вправ</div>
                </div>
                <button class="btn-start-w-active" data-idx="${wIdx}">Почати тренування</button>
            `;

            // Bind click to open interactive Live Workout overlay
            card.querySelector('.btn-start-w-active').onclick = function() {
                const idx = parseInt(this.getAttribute('data-idx'));
                launchWorkoutPlayer(data.workouts[idx]);
            };

            workoutsContainer.appendChild(card);
        });

        // 2. Render Nutrition Menu List
        dietContainer.innerHTML = '';
        data.diet.forEach(meal => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                <div class="recipe-meal-tag">${meal.type}</div>
                <h4 style="font-family: var(--font-heading); font-size: 1.05rem; font-weight: 700; margin-top:0.25rem;">${meal.name}</h4>
                <div class="recipe-macros-row">
                    <span>🔥 <strong>${meal.cal} ккал</strong></span>
                    <span>Б: <strong>${meal.p}г</strong></span>
                    <span>В: <strong>${meal.c}г</strong></span>
                    <span>Ж: <strong>${meal.f}г</strong></span>
                </div>
                <div class="recipe-cooking-details">
                    <p>${meal.desc}</p>
                </div>
            `;
            dietContainer.appendChild(card);
        });
    }

    // Opens fullscreen Live training player overlay
    function launchWorkoutPlayer(workout) {
        activeWorkoutData = workout;
        activeExerciseIdx = 0;
        playerTitle.innerText = workout.name;

        // Reset and clear running timers
        resetWorkoutTimer();

        // Show player
        playerContainer.classList.add('active');

        // Draw dot step indicators
        renderDotsProgress();

        // Render first exercise
        renderActiveExercise();

        // Start timer right away
        startTimer();
    }

    function renderActiveExercise() {
        const ex = activeWorkoutData.exercises[activeExerciseIdx];
        exTitle.innerText = ex.name;
        exDescription.innerText = ex.desc;
        exTargetReps.innerText = ex.reps;
        exAvatar.innerText = ex.avatar;

        // Select active dot indicator
        const dots = dotsRow.querySelectorAll('.progress-dot');
        dots.forEach((dot, idx) => {
            if (idx === activeExerciseIdx) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        // Update footer navigation button labels
        if (activeExerciseIdx === 0) {
            btnExPrev.style.opacity = '0.3';
            btnExPrev.style.pointerEvents = 'none';
        } else {
            btnExPrev.style.opacity = '1';
            btnExPrev.style.pointerEvents = 'auto';
        }

        if (activeExerciseIdx === activeWorkoutData.exercises.length - 1) {
            btnExNext.innerText = 'Завершити 🏁';
            btnExNext.style.background = 'var(--accent-orange)';
            btnExNext.style.color = '#FFFFFF';
            btnExNext.style.boxShadow = '0 4px 15px rgba(255, 87, 34, 0.3)';
        } else {
            btnExNext.innerText = 'Наступна 👉';
            btnExNext.style.background = 'var(--grad-primary)';
            btnExNext.style.color = '#030303';
            btnExNext.style.boxShadow = '0 4px 15px rgba(0, 230, 118, 0.3)';
        }
    }

    function renderDotsProgress() {
        dotsRow.innerHTML = '';
        activeWorkoutData.exercises.forEach(() => {
            const dot = document.createElement('div');
            dot.className = 'progress-dot';
            dotsRow.appendChild(dot);
        });
    }

    // Step navigators
    function goNextExercise() {
        if (activeExerciseIdx < activeWorkoutData.exercises.length - 1) {
            activeExerciseIdx++;
            renderActiveExercise();
        } else {
            // Last exercise clicked, finish workout!
            completeActiveWorkout();
        }
    }

    function goPrevExercise() {
        if (activeExerciseIdx > 0) {
            activeExerciseIdx--;
            renderActiveExercise();
        }
    }

    function completeActiveWorkout() {
        // Log to state
        window.FitState.completeWorkout(activeWorkoutData.name);
        
        alert(`Вітаємо! 🎉 Ви успішно завершили тренування "${activeWorkoutData.name}"!\nЧас: ${timerDisplay.innerText}`);
        
        quitActiveWorkout();
    }

    function quitActiveWorkout() {
        resetWorkoutTimer();
        playerContainer.classList.remove('active');
        activeWorkoutData = null;
    }

    // Stopwatch countdown controls
    function startTimer() {
        if (isTimerRunning) return;
        isTimerRunning = true;
        btnTimerToggle.classList.add('playing');
        btnTimerToggle.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>
            </svg>
        `;

        timerInterval = setInterval(() => {
            timerSeconds++;
            const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
            const secs = String(timerSeconds % 60).padStart(2, '0');
            timerDisplay.innerText = `${mins}:${secs}`;
        }, 1000);
    }

    function pauseTimer() {
        if (!isTimerRunning) return;
        isTimerRunning = false;
        btnTimerToggle.classList.remove('playing');
        btnTimerToggle.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
        `;
        clearInterval(timerInterval);
    }

    function toggleTimer() {
        if (isTimerRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }

    function resetWorkoutTimer() {
        pauseTimer();
        timerSeconds = 0;
        timerDisplay.innerText = '00:00';
    }

    // Listeners bootstrap hooks
    window.addEventListener('fitAppLaunched', init);
    window.addEventListener('DOMContentLoaded', init);
})();
