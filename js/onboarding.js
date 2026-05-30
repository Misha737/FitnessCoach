/**
 * Onboarding Flow Module
 * Handles multi-step form transitions, input validation, and animated plan generation.
 */

(function() {
    // Form selections
    let activeGender = 'male';
    let activeGoal = 'lose';
    let activeActivity = 'moderate';

    // Dom cache
    const onboardingSec = document.getElementById('onboarding-flow');
    const mainAppSec = document.getElementById('main-app');
    
    // Steps elements
    const step1 = document.getElementById('onboarding-step-1');
    const step2 = document.getElementById('onboarding-step-2');
    const step3 = document.getElementById('onboarding-step-3');
    const step4 = document.getElementById('onboarding-step-4');
    const stepLoading = document.getElementById('onboarding-step-loading');
    
    const steps = [step1, step2, step3, step4, stepLoading];
    let currentStepIdx = 0;

    // Inputs
    const nameInput = document.getElementById('ob-name');
    const ageInput = document.getElementById('ob-age');
    const heightInput = document.getElementById('ob-height');
    const weightInput = document.getElementById('ob-weight');
    const targetWeightInput = document.getElementById('ob-target-weight');

    // Trigger buttons
    const btnStart = document.getElementById('btn-start-onboarding');
    const btnStep2Next = document.getElementById('btn-ob-step2-next');
    const btnStep3Next = document.getElementById('btn-ob-step3-next');
    const btnFinish = document.getElementById('btn-ob-finish');
    
    // Back buttons inside forms
    const backButtons = document.querySelectorAll('.btn-back');

    // Init function
    function init() {
        if (window.FitState.data.isOnboarded) {
            onboardingSec.classList.remove('active');
            mainAppSec.classList.add('active');
            return;
        }

        // Attach Onboarding Step Transitions
        btnStart.addEventListener('click', () => goNextStep());
        
        // Gender Selector cards
        const genderCards = document.querySelectorAll('.gender-card');
        genderCards.forEach(card => {
            card.addEventListener('click', () => {
                genderCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                activeGender = card.getAttribute('data-gender');
            });
        });

        // Step 2 Next
        btnStep2Next.addEventListener('click', () => {
            const val = nameInput.value.trim();
            if (!val) {
                alert('Будь ласка, введіть своє ім\'я.');
                nameInput.focus();
                return;
            }
            goNextStep();
        });

        // Step 3 Next
        btnStep3Next.addEventListener('click', () => {
            const age = parseInt(ageInput.value);
            const height = parseInt(heightInput.value);
            const weight = parseFloat(weightInput.value);
            const targetWeight = parseFloat(targetWeightInput.value);

            if (isNaN(age) || age < 12 || age > 100) {
                alert('Будь ласка, введіть коректний вік (12-100 років).');
                return;
            }
            if (isNaN(height) || height < 100 || height > 250) {
                alert('Будь ласка, введіть коректний ріст (100-250 см).');
                return;
            }
            if (isNaN(weight) || weight < 30 || weight > 200) {
                alert('Будь ласка, введіть коректну поточну вагу.');
                return;
            }
            if (isNaN(targetWeight) || targetWeight < 30 || targetWeight > 200) {
                alert('Будь ласка, введіть коректну цільову вагу.');
                return;
            }

            goNextStep();
        });

        // Goals Selector Cards
        const goalCards = document.querySelectorAll('.goal-card');
        goalCards.forEach(card => {
            card.addEventListener('click', () => {
                goalCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                activeGoal = card.getAttribute('data-goal');
            });
        });

        // Activity options
        const activityOptions = document.querySelectorAll('.activity-option');
        activityOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                activityOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                activeActivity = opt.getAttribute('data-activity');
            });
        });

        // Onboarding Finish button
        btnFinish.addEventListener('click', () => {
            goNextStep(); // go to loading generator
            simulateAiPlanGeneration();
        });

        // Back navigations
        backButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (currentStepIdx > 0) {
                    goToStep(currentStepIdx - 1);
                }
            });
        });
    }

    // Go to exact step index
    function goToStep(idx) {
        steps.forEach((step, sIdx) => {
            if (sIdx === idx) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
        currentStepIdx = idx;
    }

    // Move to next step in row
    function goNextStep() {
        if (currentStepIdx < steps.length - 1) {
            goToStep(currentStepIdx + 1);
        }
    }

    // Simulates dynamic AI analysis loading screen with sequential tasks
    function simulateAiPlanGeneration() {
        const log1 = document.getElementById('log-step-1');
        const log2 = document.getElementById('log-step-2');
        const log3 = document.getElementById('log-step-3');
        const log4 = document.getElementById('log-step-4');

        // Put initial pending statuses
        [log1, log2, log3, log4].forEach(item => {
            item.classList.add('pending');
            item.querySelector('.log-status').innerText = '⏳';
        });

        // Step 1: Physical parameters
        setTimeout(() => {
            log1.classList.remove('pending');
            log1.classList.add('done');
            log1.querySelector('.log-status').innerText = '✅';
            
            // Step 2: Macros calculation
            setTimeout(() => {
                log2.classList.remove('pending');
                log2.classList.add('done');
                log2.querySelector('.log-status').innerText = '✅';
                
                // Step 3: Workouts generation
                setTimeout(() => {
                    log3.classList.remove('pending');
                    log3.classList.add('done');
                    log3.querySelector('.log-status').innerText = '✅';
                    
                    // Step 4: Meal blueprints
                    setTimeout(() => {
                        log4.classList.remove('pending');
                        log4.classList.add('done');
                        log4.querySelector('.log-status').innerText = '✅';
                        
                        // Wait a bit, compile state and redirect to main hub
                        setTimeout(() => {
                            saveOnboardingDataAndLaunch();
                        }, 800);

                    }, 1000);
                }, 1000);
            }, 1000);
        }, 1000);
    }

    // Save final state of onboarding and swap interface to app hub
    function saveOnboardingDataAndLaunch() {
        const userForm = {
            name: nameInput.value.trim() || 'Спортсмен',
            gender: activeGender,
            age: parseInt(ageInput.value) || 25,
            height: parseInt(heightInput.value) || 175,
            weight: parseFloat(weightInput.value) || 70,
            targetWeight: parseFloat(targetWeightInput.value) || 65,
            activityLevel: activeActivity,
            goal: activeGoal
        };

        // Write metrics inside window global state
        window.FitState.setOnboarding(userForm);

        // Hide onboarding, show Main application
        onboardingSec.classList.remove('active');
        mainAppSec.classList.add('active');

        // Trigger bootstrap initialization inside other pages
        window.dispatchEvent(new CustomEvent('fitAppLaunched'));
    }

    // Bootstrap listener
    window.addEventListener('DOMContentLoaded', init);

    // Expose reset interface helper
    window.resetOnboardingView = function() {
        // Reset local form elements
        nameInput.value = '';
        ageInput.value = '25';
        heightInput.value = '175';
        weightInput.value = '70';
        targetWeightInput.value = '65';
        
        currentStepIdx = 0;
        goToStep(0);

        mainAppSec.classList.remove('active');
        onboardingSec.classList.add('active');
    };
})();
