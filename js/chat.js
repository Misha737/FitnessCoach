/**
 * AI Coach Chat Simulation Module
 * Simulates real-time conversations with dynamic, personalized coaching advice
 * tailored to onboarding objectives, physical traits, and diet goals.
 */

(function() {
    // DOM cache
    const chatContainer = document.getElementById('chat-messages-container');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chipsContainer = document.getElementById('chat-suggestion-chips');

    function init() {
        if (!window.FitState.data.isOnboarded) return;

        renderChatHistory();
        renderSuggestionChips();

        // Send triggers
        chatSendBtn.onclick = handleUserSend;
        chatInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                handleUserSend();
            }
        };
    }

    // Render historical logs from state
    function renderChatHistory() {
        chatContainer.innerHTML = '';
        const history = window.FitState.data.chatHistory;
        
        if (history.length === 0) {
            window.FitState.addAiWelcomeMessage();
        }

        history.forEach(msg => {
            appendMessageBubble(msg.sender, msg.text, msg.time);
        });

        scrollToBottom();
    }

    // Append single bubble on screen
    function appendMessageBubble(sender, text, time) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        
        // Convert double stars to bold markdown blocks
        const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        bubble.innerHTML = `
            <div class="bubble-content">${formattedText.replace(/\n/g, '<br>')}</div>
            <span class="bubble-time">${time}</span>
        `;
        chatContainer.appendChild(bubble);
        scrollToBottom();
    }

    // Force chat window to slide focus down
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Dynamically render chips matching user current target
    function renderSuggestionChips() {
        chipsContainer.innerHTML = '';
        const state = window.FitState.data;
        const goal = state.user.goal;

        let chips = [];
        if (goal === 'lose') {
            chips = [
                'Склади моє кардіо на сьогодні 🏃',
                'Що краще їсти ввечері при дефіциті? 🥦',
                'Як побороти тягу до солодкого? 🍩',
                'Скільки калорій мені потрібно спалювати? ⚡'
            ];
        } else if (goal === 'build') {
            chips = [
                'Покажи моє силове тренування 🏋️',
                'Швидкий високобілковий перекус 🍗',
                'Скільки протеїну мені треба на день? 🥛',
                'Як часто міняти вагу на тренуваннях? 💪'
            ];
        } else {
            chips = [
                'План активностей для тонусу 🤸‍♀️',
                '3 корисні звички на кожен день 🎯',
                'Як підтримувати форму вдома? 🏠',
                'Скільки води треба пити насправді? 💧'
            ];
        }

        chips.forEach(text => {
            const chip = document.createElement('div');
            chip.className = 'suggestion-chip';
            chip.innerText = text;
            chip.onclick = () => {
                chatInput.value = text;
                handleUserSend();
            };
            chipsContainer.appendChild(chip);
        });
    }

    // Handles user message submissions
    function handleUserSend() {
        const query = chatInput.value.trim();
        if (!query) return;

        // Clear input box
        chatInput.value = '';

        // Add user log
        window.FitState.addChatMessage('user', query);
        const time = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        appendMessageBubble('user', query, time);

        // Show typing indicator animation
        showTypingIndicator();

        // Process response with simulated 1.2s thinking time
        setTimeout(() => {
            removeTypingIndicator();
            const reply = generateAiReply(query);
            window.FitState.addChatMessage('ai', reply);
            appendMessageBubble('ai', reply, time);
        }, 1200);
    }

    // Typing loading spinner placeholders
    let typingBubble = null;
    function showTypingIndicator() {
        typingBubble = document.createElement('div');
        typingBubble.className = 'chat-bubble ai typing';
        typingBubble.innerHTML = `
            <div class="typing-loader" style="display: flex; gap: 4px; padding: 4px 8px;">
                <span style="width:6px;height:6px;background:#6c5ce7;border-radius:50%;animation:typingBounce 0.6s infinite alternate;"></span>
                <span style="width:6px;height:6px;background:#6c5ce7;border-radius:50%;animation:typingBounce 0.6s 0.2s infinite alternate;"></span>
                <span style="width:6px;height:6px;background:#6c5ce7;border-radius:50%;animation:typingBounce 0.6s 0.4s infinite alternate;"></span>
            </div>
            <style>
                @keyframes typingBounce { from { transform: translateY(0); } to { transform: translateY(-5px); } }
            </style>
        `;
        chatContainer.appendChild(typingBubble);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        if (typingBubble) {
            typingBubble.remove();
            typingBubble = null;
        }
    }

    // Simulated Knowledge Base responding dynamically to user status
    function generateAiReply(query) {
        const u = window.FitState.data.user;
        const q = query.toLowerCase();
        const goalStr = u.goal === 'lose' ? 'схуднення' : u.goal === 'build' ? 'набору м\'язової маси' : 'підтримання форми';
        const weightDiff = Math.abs(u.weight - u.targetWeight).toFixed(1);

        // 1. WORKOUT INQUIRIES
        if (q.includes('тренування') || q.includes('кардіо') || q.includes('силов')) {
            if (u.goal === 'lose') {
                return `Твоє кардіо-тренування на сьогодні для **${goalStr}**:\n\n**Інтенсивне HIIT-кардіо (15-20 хв)**:\n1. Біг на місці з високим підйомом колін — 40 сек\n2. Берпі — 30 сек\n3. Стрибки "Джеки" (Jumping Jacks) — 40 сек\n4. Планка зі стрибками ніг — 30 сек\n\n*Відпочинок 1 хв після кола, всього 3 кола.* Це допоможе прискорити метаболізм та спалити додаткові калорії! Бажаєш запустити таймер у розділі **Гайди**?`;
            } else if (u.goal === 'build') {
                return `Для **набору м'язів** сьогодні рекомендовано **Силовий спліт (Верх корпусу)**:\n\n1. Віджимання від підлоги — 4 підходи х 12 разів\n2. Підтягування або тяга гантелей в нахилі — 4 підходи х 10 разів\n3. Згинання рук на біцепс — 3 підходи х 12 разів\n4. Віджимання на трицепс від лави — 3 підходи х 12 разів\n\nНамагайся робити відпочинок між підходами не більше 60-90 сек. Пам'ятай про поступове прогресування навантажень! 💪`;
            } else {
                return `Для підтримки відмінної форми та бадьорості сьогодні підійде **Функціональний тонус**:\n\n1. Присідання з власною вагою — 3 підходи х 15 разів\n2. Планка класична — 3 підходи по 45 сек\n3. Випади назад поочередно — 3 підходи х 12 разів на ногу\n4. Скручування на прес — 3 підходи х 15 разів\n\nГарний помірний темп підтримає серцево-судинну систему та м'язовий тонус без надмірної перевтоми!`;
            }
        }

        // 2. DIET & RECIPE INQUIRIES
        if (q.includes('їсти') || q.includes('перекус') || q.includes('харчування') || q.includes('вечер') || q.includes('солодк')) {
            if (q.includes('солодк')) {
                return `Тяга до солодкого найчастіше виникає через нестачу складних вуглеводів або хрому. \n\n**Порада AI Coach**:\n1. Заміни солодощі на фрукти (яблуко 🍎 або ягоди) або порцію протеїнового шейку.\n2. Переконайся, що ти споживаєш достатньо складних вуглеводів (вівсянка, бурий рис) у першій половині дня.\n3. Спробуй випити склянку води з лимоном — це часто пригнічує раптовий апетит.`;
            }
            if (u.goal === 'lose') {
                return `Для схуднення твоя вечеря має бути легкою, але ситною. **Найкращий варіант**:\n\n🥗 **Запечена тріска або куряче філе з броколі та огірком**.\n- Калорійність: ~240 ккал\n- Білки: 30г | Жири: 4г | Вуглеводи: 6г\n\nТакий склад захистить твої м'язи під час дефіциту калорій і не перевантажить травлення перед сном!`;
            } else {
                return `Тобі чудово підійде **Високобілковий швидкий перекус**:\n\n🥛 **Кисломолочний сир (150г, 5% жирності) з жменею горіхів та медом**.\n- Калорійність: ~260 ккал\n- Білки: 28г | Жири: 10г | Вуглеводи: 12г\n\nЦе відмінне джерело казеїнового білка, який буде довго живити твої м'язи!`;
            }
        }

        // 3. CALORIE & PROTEIN INQUIRIES
        if (q.includes('калорій') || q.includes('протеїн') || q.includes('білок') || q.includes('норма')) {
            return `За твоїми параметрами (вага **${u.weight} кг**, ціль **${goalStr}**):\n\n- Твоя добова норма калорій: **${u.bmr} ккал**\n- Ціль білків: **${u.macros.protein} г**\n- Ціль вуглеводів: **${u.macros.carbs} г**\n- Ціль жирів: **${u.macros.fat} г**\n\nТи можеш відстежувати свій прогрес прямо на вкладці **Калорії**, додаючи страви у Щоденник!`;
        }

        // 4. WATER INQUIRIES
        if (q.includes('вод') || q.includes('пит')) {
            return `Твоя індивідуальна норма води розрахована виходячи з ваги **${u.weight} кг** і становить **${u.waterGoal} склянок на день** (~2-2.2 л).\n\nПитна вода допомагає транспортувати нутрієнти, покращує спалювання жиру та виводить токсини. Намагайся пити рівномірно протягом дня!`;
        }

        // 5. WEIGHT / METRICS INQUIRIES
        if (q.includes('ваг') || q.includes('ціль') || q.includes('схудн')) {
            return `Зараз твоя вага становить **${u.weight} кг**, а ціль — **${u.targetWeight} кг**. Тобі залишилося скоригувати **${weightDiff} кг**.\n\nЗавдяки дефіциту калорій та регулярній активності це цілком реально зробити за здоровий період часу. Головне — послідовність та регулярне заповнення щоденників!`;
        }

        // 6. GENERAL FALLBACK/ENCOURAGING REMARK
        return `Чудове запитання! Як твій AI тренер, я рекомендую фокусуватися на щоденних маленьких перемогах: дотримуйся норми калорій (**${u.bmr} ккал**), випивай свою норму води та роби хоча б легку зарядку.\n\nПідкажи, який аспект тебе зараз цікавить більше — **харчування** чи **план тренувань**?`;
    }

    // Bootstrap hooks
    window.addEventListener('fitAppLaunched', init);
    window.addEventListener('DOMContentLoaded', init);
})();
