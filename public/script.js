//script.js

// State Management
let currentDate = new Date();
let currentView = 'month'; // 'year' | 'month' | 'week'
let events = [];
let currentUser = JSON.parse(sessionStorage.getItem('social_user')) || null;
let isSignUpMode = false;

// DOM Elements
const viewContainer = document.getElementById('view-container');
const currentDateLabel = document.getElementById('current-date-label');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

// View Toggle Buttons
const viewYearBtn = document.getElementById('view-year');
const viewMonthBtn = document.getElementById('view-month');
const viewWeekBtn = document.getElementById('view-week');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

// Event Modal Elements
const modal = document.getElementById('event-modal');
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const eventForm = document.getElementById('event-form');
const deleteBtn = document.getElementById('delete-btn');

// Auth Modal Elements
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authUsernameInput = document.getElementById('auth-username');
const authPasswordInput = document.getElementById('auth-password');
const authConfirmPasswordInput = document.getElementById('auth-confirm-password');
const confirmPasswordGroup = document.getElementById('confirm-password-group');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authToggleMsg = document.getElementById('auth-toggle-msg');
const authError = document.getElementById('auth-error');
const userBadge = document.getElementById('user-badge');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');

// Event Input Fields
const eventIdInput = document.getElementById('event-id');
const titleInput = document.getElementById('post-title');
const typeInput = document.getElementById('post-type');

// Robust fallback selector for status input (handles 'post-status', 'status', or 'event-status')
const statusInput = document.getElementById('post-status') || document.getElementById('status') || document.getElementById('event-status') || document.querySelector('select[name="status"]');

const dueDateInput = document.getElementById('due-date');
const timeInput = document.getElementById('post-time');
const prepTimeInput = document.getElementById('prep-time');
const notesInput = document.getElementById('notes');

const postTimeLabel = document.getElementById('post-time-label');
const prepTimeLabel = document.getElementById('prep-time-label');

const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
];

/* ==========================================
   THEME TOGGLE
   ========================================== */
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    themeToggleBtn.textContent = '☀️';
} else {
    themeToggleBtn.textContent = '🌙';
}

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
});

/* ==========================================
   PREPARATION FORMAT & DYNAMIC DROPDOWNS
   ========================================== */
function updateFormatFields(formatType) {
    prepTimeInput.innerHTML = '';

    if (formatType === 'Preparation') {
        postTimeLabel.textContent = 'Start Time';
        prepTimeLabel.textContent = 'Time Required';

        const durationOptions = [
            '15 mins', '30 mins', '45 mins',
            '1 hour', '1.5 hours', '2 hours', '2.5 hours',
            '3 hours', '3.5 hours', '4 hours', '5 hours',
            '6 hours', '7 hours', '8 hours', '10 hours', '12 hours'
        ];

        durationOptions.forEach(optVal => {
            const opt = document.createElement('option');
            opt.value = optVal;
            opt.textContent = optVal;
            prepTimeInput.appendChild(opt);
        });
    } else {
        postTimeLabel.textContent = 'Posting Time';
        prepTimeLabel.textContent = 'Prep Time Required';

        const prepOptions = [
            { val: 'None', text: 'None' },
            { val: '15 mins', text: '15 minutes before' },
            { val: '30 mins', text: '30 minutes before' },
            { val: '45 mins', text: '45 minutes before' },
            { val: '1 hour', text: '1 hour before' },
            { val: '2 hours', text: '2 hours before' },
            { val: '3 hours', text: '3 hours before' },
            { val: '1 day', text: '1 day before' },
            { val: '2 days', text: '2 days before' },
            { val: '3 days', text: '3 days before' },
            { val: '5 days', text: '5 days before' },
            { val: '1 week', text: '1 week before' }
        ];

        prepOptions.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.val;
            opt.textContent = p.text;
            prepTimeInput.appendChild(opt);
        });
    }
}

typeInput.addEventListener('change', (e) => {
    updateFormatFields(e.target.value);
});

/* Dynamic parsing of prep time & duration strings to minutes */
function getPrepMinutes(prepStr) {
    if (!prepStr || prepStr === 'None') return 0;
    
    if (prepStr.includes('week')) {
        const num = parseFloat(prepStr) || 1;
        return num * 10080;
    }
    if (prepStr.includes('day')) {
        const num = parseFloat(prepStr) || 1;
        return num * 1440;
    }
    if (prepStr.includes('hour')) {
        const num = parseFloat(prepStr) || 1;
        return Math.round(num * 60);
    }
    if (prepStr.includes('min')) {
        const num = parseFloat(prepStr) || 1;
        return num;
    }
    return 0;
}

/* ==========================================
   AUTHENTICATION & API INTEGRATION
   ========================================== */
authToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    authError.textContent = '';
    authForm.reset();

    if (isSignUpMode) {
        authTitle.textContent = 'Create Account';
        confirmPasswordGroup.classList.remove('hidden');
        authConfirmPasswordInput.required = true;
        authSubmitBtn.textContent = 'Sign Up';
        authToggleMsg.textContent = 'Already have an account?';
        authToggleBtn.textContent = 'Sign In';
    } else {
        authTitle.textContent = 'Sign In';
        confirmPasswordGroup.classList.add('hidden');
        authConfirmPasswordInput.required = false;
        authSubmitBtn.textContent = 'Sign In';
        authToggleMsg.textContent = "Don't have an account?";
        authToggleBtn.textContent = 'Sign Up';
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.textContent = '';

    const username = authUsernameInput.value.trim();
    const password = authPasswordInput.value;
    const confirmPassword = authConfirmPasswordInput.value;

    const endpoint = isSignUpMode ? '/api/signup' : '/api/signin';
    const payload = isSignUpMode 
        ? { username, password, confirmPassword } 
        : { username, password };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            authError.textContent = data.error || 'Authentication failed.';
            return;
        }

        if (isSignUpMode) {
            alert('Account created successfully! Please sign in.');
            authToggleBtn.click();
        } else {
            currentUser = data;
            sessionStorage.setItem('social_user', JSON.stringify(currentUser));
            initApp();
        }
    } catch (err) {
        authError.textContent = 'Server connection failed.';
    }
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('social_user');
    events = [];
    userBadge.classList.add('hidden');
    authModal.classList.remove('hidden');
    viewContainer.innerHTML = '';
});

async function loadUserEvents() {
    if (!currentUser) return;
    try {
        const response = await fetch(`/api/events/${currentUser.userId}`);
        if (response.ok) {
            events = await response.json();
            renderView();
            renderTodoList();
        }
    } catch (err) {
        console.error('Failed to load events:', err);
    }
}

function initApp() {
    if (currentUser) {
        authModal.classList.add('hidden');
        usernameDisplay.textContent = `👤 ${currentUser.username}`;
        userBadge.classList.remove('hidden');
        loadUserEvents();
    } else {
        authModal.classList.remove('hidden');
    }
}

/* ==========================================
   HELPERS & VIEW CONTROLS
   ========================================== */
function getTypeEmoji(type) {
    switch (type) {
        case 'Reel': return '🎬';
        case 'Post': return '📸';
        case 'Story': return '⚡';
        case 'Preparation': return '📋';
        default: return '📌';
    }
}

function getStatusClass(status) {
    return (status || 'Draft').replace(/\s+/g, '-');
}

function populateTimeSelect() {
    timeInput.innerHTML = '';
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const hStr = String(h).padStart(2, '0');
            const mStr = String(m).padStart(2, '0');
            const val = `${hStr}:${mStr}`;
            
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = format12Hour(val);
            timeInput.appendChild(opt);
        }
    }
}

function format12Hour(time24) {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}

function switchView(newView) {
    if (currentView === newView) return;

    viewYearBtn.classList.toggle('active', newView === 'year');
    viewMonthBtn.classList.toggle('active', newView === 'month');
    viewWeekBtn.classList.toggle('active', newView === 'week');

    viewContainer.classList.remove('fade-in');
    viewContainer.classList.add('fade-out');

    setTimeout(() => {
        currentView = newView;
        renderView();
        viewContainer.classList.remove('fade-out');
        viewContainer.classList.add('fade-in');
    }, 150);
}

function renderView() {
    // Save the current scroll position before clearing the container
    const weekWrapper = document.querySelector('.week-grid-wrapper');
    const scrollPos = weekWrapper ? weekWrapper.scrollTop : window.scrollY;

    viewContainer.innerHTML = '';

    if (currentView === 'month') {
        renderMonthView();
    } else if (currentView === 'week') {
        renderWeekView();
    } else if (currentView === 'year') {
        renderYearView();
    }

    // Restore the scroll position after rendering the new view
    const newWeekWrapper = document.querySelector('.week-grid-wrapper');
    if (newWeekWrapper && scrollPos) {
        newWeekWrapper.scrollTop = scrollPos;
    } else if (!newWeekWrapper && scrollPos) {
        window.scrollTo(0, scrollPos);
    }
}

/* ==========================================
   DRAG AND DROP RESCHEDULING
   ========================================== */
/* ==========================================
   DRAG AND DROP RESCHEDULING
   ========================================== */
async function handleEventDrop(eventId, targetDate, targetTime = null) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    let updated = false;

    // Check if the date changed
    if (event.dueDate !== targetDate) {
        event.dueDate = targetDate;
        updated = true;
    }

    // Check if a target time was provided and if it changed
    if (targetTime && event.time !== targetTime) {
        event.time = targetTime;
        updated = true;
    }

    // If neither date nor time changed, do nothing
    if (!updated) return;

    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });

        if (response.ok) {
            loadUserEvents();
        }
    } catch (err) {
        console.error('Failed to reschedule event:', err);
    }
}
/* ==========================================
   1. MONTHLY VIEW
   ========================================== */
function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    currentDateLabel.textContent = `${monthNames[month]} ${year}`;

    const wrapper = document.createElement('div');
    wrapper.classList.add('calendar-wrapper');

    const header = document.createElement('div');
    header.classList.add('calendar-header');
    header.innerHTML = `
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
    `;
    wrapper.appendChild(header);

    const grid = document.createElement('div');
    grid.classList.add('calendar-grid');

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('day-cell', 'empty');
        grid.appendChild(emptyCell);
    }

    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell');

        const monthFormatted = String(month + 1).padStart(2, '0');
        const dayFormatted = String(day).padStart(2, '0');
        const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;
        dayCell.setAttribute('data-date', dateStr);

        // Drop zone handlers
        dayCell.addEventListener('dragover', (e) => {
            e.preventDefault();
            dayCell.classList.add('drag-over');
        });

        dayCell.addEventListener('dragleave', () => {
            dayCell.classList.remove('drag-over');
        });

        dayCell.addEventListener('drop', (e) => {
            e.preventDefault();
            dayCell.classList.remove('drag-over');
            const eventId = e.dataTransfer.getData('text/plain');
            handleEventDrop(eventId, dateStr);
        });

        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayCell.classList.add('today');
        }

        const dayNum = document.createElement('span');
        dayNum.classList.add('day-number');

        const cellDate = new Date(year, month, day);
        if (cellDate.getDay() === 0) dayNum.classList.add('sunday');

        dayNum.textContent = day;
        dayCell.appendChild(dayNum);

        // Container for events to enable smooth scrolling without breaking cell heights
        const eventsContainer = document.createElement('div');
        eventsContainer.classList.add('day-events-container');

        // Strictly chronological ordering by time
        const dayEvents = events
            .filter(e => e.dueDate === dateStr)
            .sort((a, b) => a.time.localeCompare(b.time));

        dayEvents.forEach(evt => {
            const bulletItem = document.createElement('div');
            bulletItem.classList.add('month-bullet-item');
            bulletItem.setAttribute('draggable', 'true');

            bulletItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', evt.id);
            });

            const statusClass = getStatusClass(evt.status);

            bulletItem.innerHTML = `
                <div class="month-bullet-top">
                    <span class="event-dot ${evt.type}"></span>
                    <span class="month-bullet-time">${format12Hour(evt.time)}</span>
                    <span class="month-bullet-title">${evt.title}</span>
                </div>
                <div class="month-bullet-bottom">
                    <span class="status-pill ${statusClass}">${evt.status || 'Draft'}</span>
                </div>
            `;

            bulletItem.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(evt);
            });

            eventsContainer.appendChild(bulletItem);
        });

        dayCell.appendChild(eventsContainer);

        dayCell.addEventListener('click', (e) => {
            if (e.target === dayCell || e.target === dayNum || e.target === eventsContainer) {
                openModalWithDate(dateStr);
            }
        });

        grid.appendChild(dayCell);
    }

    wrapper.appendChild(grid);
    viewContainer.appendChild(wrapper);
}

/* ==========================================
   2. WEEKLY VIEW
   ========================================== */
function renderWeekView() {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    currentDateLabel.textContent = `${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${startOfWeek.getMonth() !== endOfWeek.getMonth() ? monthNames[endOfWeek.getMonth()] + ' ' : ''}${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;

    const wrapper = document.createElement('div');
    wrapper.classList.add('calendar-wrapper', 'week-grid-wrapper');

    const weekHeader = document.createElement('div');
    weekHeader.classList.add('week-header');
    weekHeader.innerHTML = `<div class="week-header-cell">Time</div>`;

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        weekDays.push(d);

        const isSunday = d.getDay() === 0;
        const cell = document.createElement('div');
        cell.classList.add('week-header-cell');
        if (isSunday) cell.classList.add('sunday-header');
        cell.innerHTML = `<div>${d.toLocaleDateString('en-US', { weekday: 'short' })}</div><div><strong>${d.getDate()}</strong></div>`;
        weekHeader.appendChild(cell);
    }
    wrapper.appendChild(weekHeader);

    const weekBody = document.createElement('div');
    weekBody.classList.add('week-body');

    const timeCol = document.createElement('div');
    timeCol.classList.add('time-col');
    for (let hour = 0; hour < 24; hour++) {
        const label = document.createElement('div');
        label.classList.add('time-slot-label');
        const timeFormatted = hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
        label.textContent = timeFormatted;
        timeCol.appendChild(label);
    }
    weekBody.appendChild(timeCol);

    const HOUR_HEIGHT = 60;

    weekDays.forEach(d => {
        const dayCol = document.createElement('div');
        dayCol.classList.add('week-day-col');

        const monthFormatted = String(d.getMonth() + 1).padStart(2, '0');
        const dayFormatted = String(d.getDate()).padStart(2, '0');
        const dateStr = `${d.getFullYear()}-${monthFormatted}-${dayFormatted}`;
        dayCol.setAttribute('data-date', dateStr);

        dayCol.addEventListener('dragover', (e) => {
            e.preventDefault();
            dayCol.classList.add('drag-over');
        });

        dayCol.addEventListener('dragleave', () => {
            dayCol.classList.remove('drag-over');
        });

        dayCol.addEventListener('drop', (e) => {
            e.preventDefault();
            dayCol.classList.remove('drag-over');
            const eventId = e.dataTransfer.getData('text/plain');

            // Use the scrollable wrapper's bounding rect as the master coordinate space
            const wrapper = document.querySelector('.week-grid-wrapper');
            const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : dayCol.getBoundingClientRect();
            const scrollTop = wrapper ? wrapper.scrollTop : 0;
            
            // Calculate pixel offset from the top of the entire scrollable grid area
            const offsetY = (e.clientY - wrapperRect.top) + scrollTop;
            const HOUR_HEIGHT = 60; // 60px per hour

            const totalMinutes = Math.max(0, Math.min(1439, (offsetY / HOUR_HEIGHT) * 60));
            const roundedMinutes = Math.round(totalMinutes / 15) * 15;
            
            const hours = Math.floor(roundedMinutes / 60);
            const minutes = roundedMinutes % 60;

            const targetTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

            handleEventDrop(eventId, dateStr, targetTime);
        });

        for (let hour = 0; hour < 24; hour++) {
            const hCell = document.createElement('div');
            hCell.classList.add('hour-cell');
            dayCol.appendChild(hCell);
        }

        const dayEvents = events
            .filter(e => e.dueDate === dateStr)
            .sort((a, b) => a.time.localeCompare(b.time));

        dayEvents.forEach(evt => {
            const [hrs, mins] = evt.time.split(':').map(Number);
            const postStartMins = hrs * 60 + mins;

            let blockStartMins = postStartMins;
            let prepBlockMins = 0;
            let postDurationMins = 24;

            if (evt.type === 'Preparation') {
                const prepMins = getPrepMinutes(evt.prepTime);
                postDurationMins = prepMins > 0 ? prepMins : 30;
            } else {
                const prepMins = getPrepMinutes(evt.prepTime);
                if (prepMins > 0 && prepMins <= 180) {
                    blockStartMins = Math.max(0, postStartMins - prepMins);
                    prepBlockMins = postStartMins - blockStartMins;
                }
            }

            const totalDurationMins = prepBlockMins + postDurationMins;
            const topPx = (blockStartMins / 60) * HOUR_HEIGHT;
            const heightPx = Math.max(24, (totalDurationMins / 60) * HOUR_HEIGHT);

            const cardWrapper = document.createElement('div');
            cardWrapper.classList.add('week-event-wrapper');
            cardWrapper.style.top = `${topPx}px`;
            cardWrapper.style.height = `${heightPx}px`;
            cardWrapper.setAttribute('draggable', 'true');

            cardWrapper.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', evt.id);
            });

            const hasPrep = prepBlockMins > 0;
            if (!hasPrep) cardWrapper.classList.add('no-prep');

            let prepHTML = '';
            if (hasPrep) {
                const prepHeightPx = (prepBlockMins / 60) * HOUR_HEIGHT;
                prepHTML = `<div class="week-prep-block" style="height: ${prepHeightPx}px;">🛠️ Prep: ${evt.prepTime}</div>`;
            }

            const emoji = getTypeEmoji(evt.type);
            const statusClass = getStatusClass(evt.status);

            cardWrapper.innerHTML = `
                ${prepHTML}
                <div class="week-post-block">
                    <div class="event-title ${evt.type}">${emoji} ${evt.title}</div>
                    <div class="event-meta">
                        <span class="status-pill ${statusClass}">${evt.status || 'Draft'}</span>
                        <span>${format12Hour(evt.time)}</span>
                    </div>
                </div>
            `;

            cardWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(evt);
            });

            dayCol.appendChild(cardWrapper);
        });

        dayCol.addEventListener('click', () => openModalWithDate(dateStr));
        weekBody.appendChild(dayCol);
    });

    wrapper.appendChild(weekBody);
    viewContainer.appendChild(wrapper);
}

/* ==========================================
   3. YEARLY VIEW
   ========================================== */
function renderYearView() {
    const year = currentDate.getFullYear();
    currentDateLabel.textContent = `${year}`;

    const grid = document.createElement('div');
    grid.classList.add('year-grid');

    for (let m = 0; m < 12; m++) {
        const monthCard = document.createElement('div');
        monthCard.classList.add('mini-month');

        const title = document.createElement('div');
        title.classList.add('mini-month-title');
        title.textContent = monthNames[m];
        monthCard.appendChild(title);

        const miniGrid = document.createElement('div');
        miniGrid.classList.add('mini-month-grid');

        ['S','M','T','W','T','F','S'].forEach(dayInit => {
            const h = document.createElement('div');
            h.style.fontWeight = 'bold';
            h.textContent = dayInit;
            miniGrid.appendChild(h);
        });

        const firstDay = new Date(year, m, 1).getDay();
        const totalDays = new Date(year, m + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            miniGrid.appendChild(document.createElement('div'));
        }

        for (let d = 1; d <= totalDays; d++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('mini-day-cell');

            const monthFormatted = String(m + 1).padStart(2, '0');
            const dayFormatted = String(d).padStart(2, '0');
            const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;

            const cellDate = new Date(year, m, d);
            if (cellDate.getDay() === 0) dayCell.classList.add('sunday');

            const dayEvents = events.filter(e => e.dueDate === dateStr);

            const numSpan = document.createElement('span');
            numSpan.textContent = d;
            dayCell.appendChild(numSpan);

            if (dayEvents.length > 0) {
                const dotsContainer = document.createElement('div');
                dotsContainer.classList.add('mini-dots-container');

                dayEvents.slice(0, 3).forEach(evt => {
                    const dot = document.createElement('span');
                    dot.classList.add('event-dot', evt.type);
                    dotsContainer.appendChild(dot);
                });

                dayCell.appendChild(dotsContainer);
            }

            miniGrid.appendChild(dayCell);
        }

        monthCard.appendChild(miniGrid);

        monthCard.addEventListener('click', () => {
            currentDate = new Date(year, m, 1);
            switchView('month');
        });

        grid.appendChild(monthCard);
    }

    viewContainer.appendChild(grid);
}

/* ==========================================
   NAVIGATION & MODAL HANDLERS
   ========================================== */
prevBtn.addEventListener('click', () => {
    if (currentView === 'year') {
        currentDate.setFullYear(currentDate.getFullYear() - 1);
    } else if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() - 1);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() - 7);
    }
    renderView();
});

nextBtn.addEventListener('click', () => {
    if (currentView === 'year') {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
    } else if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + 7);
    }
    renderView();
});

viewYearBtn.addEventListener('click', () => switchView('year'));
viewMonthBtn.addEventListener('click', () => switchView('month'));
viewWeekBtn.addEventListener('click', () => switchView('week'));

function openModal() { modal.classList.remove('hidden'); }

function closeModal() {
    modal.classList.add('hidden');
    eventForm.reset();
    eventIdInput.value = '';
    if (statusInput) statusInput.value = 'Draft';
    deleteBtn.classList.add('hidden');
    updateFormatFields(typeInput.value);
}

function openModalWithDate(dateStr) {
    eventForm.reset();
    eventIdInput.value = '';
    dueDateInput.value = dateStr;
    if (statusInput) statusInput.value = 'Draft';
    typeInput.value = 'Reel';
    updateFormatFields('Reel');
    deleteBtn.classList.add('hidden');
    openModal();
}

function openEditModal(eventObj) {
    eventIdInput.value = eventObj.id;
    titleInput.value = eventObj.title;
    typeInput.value = eventObj.type;
    
    if (statusInput) {
        statusInput.value = eventObj.status || 'Draft';
    }
    
    dueDateInput.value = eventObj.dueDate;
    timeInput.value = eventObj.time;
    notesInput.value = eventObj.notes || '';

    updateFormatFields(eventObj.type);
    prepTimeInput.value = eventObj.prepTime;

    deleteBtn.classList.remove('hidden');
    openModal();
}

openModalBtn.addEventListener('click', () => {
    updateFormatFields(typeInput.value);
    openModal();
});

closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

// Save / Update Event in SQLite
eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const id = eventIdInput.value || Date.now().toString();
    const eventData = {
        id: id,
        userId: currentUser.userId,
        title: titleInput.value,
        type: typeInput.value,
        status: statusInput ? statusInput.value : 'Draft',
        dueDate: dueDateInput.value,
        time: timeInput.value,
        prepTime: prepTimeInput.value,
        notes: notesInput.value
    };

    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });

        if (response.ok) {
            closeModal();
            loadUserEvents();
        } else {
            alert('Failed to save schedule on server.');
        }
    } catch (err) {
        alert('Server connection failed while saving.');
    }
});

// Delete Event from SQLite
deleteBtn.addEventListener('click', async () => {
    const id = eventIdInput.value;
    if (!id) return;

    try {
        const response = await fetch(`/api/events/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            closeModal();
            loadUserEvents();
        }
    } catch (err) {
        alert('Failed to delete schedule.');
    }
});

// Initial Setup
populateTimeSelect();
updateFormatFields('Reel');
initApp();

/* ==========================================
   TO-DO LIST SIDEBAR
   ========================================== */
function renderTodoList() {
    const todoContainer = document.getElementById('todo-list-container');
    if (!todoContainer) return;

    todoContainer.innerHTML = '';

    // Filter out events that are already Published
    const pendingEvents = events
        .filter(evt => evt.status !== 'Published')
        .sort((a, b) => {
            const dateCompare = a.dueDate.localeCompare(b.dueDate);
            if (dateCompare !== 0) return dateCompare;
            return (a.time || '').localeCompare(b.time || '');
        });

    if (pendingEvents.length === 0) {
        todoContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; margin-top: 20px;">All caught up! No pending tasks.</p>`;
        return;
    }

    pendingEvents.forEach(evt => {
        const item = document.createElement('div');
        item.classList.add('todo-item');

        const emoji = getTypeEmoji(evt.type);
        const formattedDate = new Date(evt.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const formattedTime = format12Hour(evt.time);

        item.innerHTML = `
            <input type="checkbox" class="todo-checkbox" title="Mark as Published">
            <div class="todo-details">
                <span class="todo-title">${emoji} ${evt.title}</span>
                <div class="todo-meta">
                    <span>📅 ${formattedDate}</span>
                    ${formattedTime ? `<span>⏰ ${formattedTime}</span>` : ''}
                    <span class="status-pill ${getStatusClass(evt.status)}">${evt.status || 'Draft'}</span>
                </div>
            </div>
        `;

        const checkbox = item.querySelector('.todo-checkbox');
        checkbox.addEventListener('change', async () => {
            if (checkbox.checked) {
                evt.status = 'Published';

                try {
                    const response = await fetch('/api/events', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(evt)
                    });

                    if (response.ok) {
                        loadUserEvents(); // Refresh views and to-do sidebar automatically
                    }
                } catch (err) {
                    console.error('Failed to update event status:', err);
                    checkbox.checked = false; // Revert if failed
                    evt.status = 'Draft';
                }
            }
        });

        todoContainer.appendChild(item);
    });
}