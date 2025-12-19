// State
let dishes = JSON.parse(localStorage.getItem('menu_dishes')) || [
    { id: 1, name: '番茄炒蛋', type: 'veg', ingredients: '番茄, 鸡蛋, 葱', notes: '快手菜' },
    { id: 2, name: '红烧排骨', type: 'meat', ingredients: '排骨, 冰糖, 姜, 葱', notes: '爸爸爱吃' },
    { id: 3, name: '紫菜蛋花汤', type: 'soup', ingredients: '紫菜, 鸡蛋, 虾皮', notes: '饭后' }
];
let mealPlan = JSON.parse(localStorage.getItem('menu_plan')) || {};

// State for UI
let currentPlannerTarget = null; // { day: 'thu', type: 'lunch' }
let dishToDeleteId = null; // Store ID for deletion

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page-section');
const pageTitle = document.getElementById('page-title');
const headerActionBtn = document.getElementById('header-action-btn');

// Init
init();

function init() {
    renderPlanner();
    renderDishList();
    setupNav();
    setupModals();
    setupConfirmModal();
    
    // Header Action Button Logic
    headerActionBtn.addEventListener('click', () => {
        openDishForm(); // Add new dish
    });
}

// --- Navigation ---
function setupNav() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Active State
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            // Show Page
            const targetId = item.dataset.target;
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            
            // Update Header
            pageTitle.textContent = item.dataset.title;
            
            // Action Button Visibility (Only on Dishes page)
            if (targetId === 'page-dishes') {
                headerActionBtn.classList.remove('hidden');
            } else {
                headerActionBtn.classList.add('hidden');
            }

            // Refresh Logic if needed
            if (targetId === 'page-shopping') renderShoppingList();
        });
    });
}

// --- Planner Logic ---
function renderPlanner() {
    const rows = document.querySelectorAll('.meal-row');
    rows.forEach(row => {
        const day = row.dataset.day;
        const type = row.dataset.type;
        const key = `${day}-${type}`;
        const container = row.querySelector('.meal-content');
        
        container.innerHTML = '';
        
        // Get planned dishes
        let dishIds = mealPlan[key];
        if (!dishIds) {
            // Empty state - Click to add
            container.innerHTML = '<span style="color:#ccc; font-size:0.9rem;">点击添加菜品...</span>';
        } else {
            if (!Array.isArray(dishIds)) dishIds = [dishIds];
            
            dishIds.forEach(id => {
                const dish = dishes.find(d => d.id === id);
                if (dish) {
                    const tag = document.createElement('div');
                    tag.className = 'planned-dish';
                    tag.innerHTML = `
                        ${dish.name}
                        <span class="remove-dish" data-key="${key}" data-id="${id}">×</span>
                    `;
                    container.appendChild(tag);
                }
            });
        }

        // Row Click Event (Add Dish)
        row.onclick = (e) => {
            // If clicked remove button, handle removal
            if (e.target.classList.contains('remove-dish')) {
                const k = e.target.dataset.key;
                const i = parseInt(e.target.dataset.id);
                removeDishFromPlan(k, i);
                e.stopPropagation();
                return;
            }
            
            // Else open selector
            openDishSelector(day, type);
        };
    });
}

function removeDishFromPlan(key, id) {
    let current = mealPlan[key];
    if (Array.isArray(current)) {
        mealPlan[key] = current.filter(cid => cid !== id);
        if (mealPlan[key].length === 0) delete mealPlan[key];
    } else {
        delete mealPlan[key];
    }
    saveData();
    renderPlanner();
}

document.getElementById('clear-plan-btn').addEventListener('click', () => {
    if(confirm('清空本周所有安排？')) {
        mealPlan = {};
        saveData();
        renderPlanner();
        showToast('已清空');
    }
});

// --- Dish Selector (Bottom Sheet) ---
function openDishSelector(day, type) {
    currentPlannerTarget = { day, type };
    const list = document.getElementById('selector-list');
    list.innerHTML = '';
    
    // Group by type or simple list? Simple list for now
    dishes.forEach(dish => {
        const item = document.createElement('div');
        item.className = 'selector-item';
        const icon = { meat:'🍖', veg:'🥬', soup:'🍲' }[dish.type];
        item.innerHTML = `
            <span>${icon} ${dish.name}</span>
            <span style="color:#999; font-size:1.2rem;">+</span>
        `;
        item.onclick = () => selectDishForPlan(dish.id);
        list.appendChild(item);
    });
    
    showModal('selector-modal');
}

function selectDishForPlan(dishId) {
    if (!currentPlannerTarget) return;
    const { day, type } = currentPlannerTarget;
    const key = `${day}-${type}`;
    
    let current = mealPlan[key] || [];
    if (!Array.isArray(current)) current = [current];
    
    if (!current.includes(dishId)) {
        current.push(dishId);
        mealPlan[key] = current;
        saveData();
        renderPlanner();
        showToast('已添加');
    }
    
    hideModal('selector-modal');
}

// --- Dish Management ---
function showDishPractice(id) {
    const dish = dishes.find(d => d.id === id);
    if (!dish) return;

    const content = dish.steps ? dish.steps.trim() : '暂无做法信息';

    // Check if it is a link (starts with http:// or https://)
    if (content.match(/^https?:\/\//i)) {
        window.open(content, '_blank');
    } else {
        document.getElementById('recipe-title').innerText = dish.name;
        document.getElementById('recipe-content').innerText = content;
        showModal('recipe-modal');
    }
}

function renderDishList() {
    const container = document.getElementById('dish-list-container');
    const filter = document.getElementById('dish-search').value.toLowerCase();
    container.innerHTML = '';
    
    const filtered = dishes.filter(d => d.name.toLowerCase().includes(filter));
    
    filtered.forEach(dish => {
        // Create Container
        const swipeContainer = document.createElement('div');
        swipeContainer.className = 'dish-swipe-container';
        
        // Icon
        const icon = { meat:'🍖', veg:'🥬', soup:'🍲' }[dish.type];

        swipeContainer.innerHTML = `
            <div class="dish-delete-action" data-id="${dish.id}">删除</div>
            <div class="dish-card" data-id="${dish.id}">
                <div class="dish-info" onclick="showDishPractice(${dish.id})">
                    <h4><span class="dish-icon">${icon}</span>${dish.name}</h4>
                    <div class="dish-meta">${dish.ingredients || '无食材信息'}</div>
                </div>
                <div class="dish-actions">
                    <button class="btn-primary-outline" onclick="openDishForm(${dish.id})">编辑</button>
                </div>
            </div>
        `;

        container.appendChild(swipeContainer);
        
        // Add swipe listeners to this specific card
        setupSwipe(swipeContainer.querySelector('.dish-card'));
        
        // Add delete listener
        const deleteBtn = swipeContainer.querySelector('.dish-delete-action');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteDish(dish.id);
        });
    });
}

// Swipe Logic
function setupSwipe(element) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwiping = false;
    let isOpened = false;
    const threshold = 30; // Min distance to trigger swipe
    const maxSwipe = -80; // Max left swipe distance (width of delete btn)

    element.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        
        // If already opened, set currentX to maxSwipe to allow closing
        if (element.classList.contains('swiped-left')) {
            currentX = maxSwipe;
            isOpened = true;
        } else {
            currentX = 0;
            isOpened = false;
            // Close others
            document.querySelectorAll('.dish-card.swiped-left').forEach(el => {
                if (el !== element) {
                    el.style.transform = 'translateX(0)';
                    el.classList.remove('swiped-left');
                }
            });
        }
        
        element.style.transition = 'none'; // Disable transition during drag
    }, {passive: true});

    element.addEventListener('touchmove', (e) => {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = touchX - startX;
        const deltaY = touchY - startY;

        // Determine if scrolling or swiping (more horizontal than vertical)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
            isSwiping = true;
            // e.preventDefault(); // Prevent scrolling if needed, but 'passive: true' prevents this. 
            // In modern browsers, better to let scroll happen if angle is steep, but here we want horizontal control.
            
            let newX = currentX + deltaX;
            
            // Boundary checks
            if (newX > 0) newX = 0; // Cannot swipe right past start
            if (newX < maxSwipe * 1.5) newX = maxSwipe * 1.5; // Resistance past max

            element.style.transform = `translateX(${newX}px)`;
        }
    }, {passive: true});

    element.addEventListener('touchend', (e) => {
        element.style.transition = 'transform 0.2s ease-out';
        const touchX = e.changedTouches[0].clientX;
        const deltaX = touchX - startX;

        if (isSwiping) {
            if (!isOpened) {
                // Was closed, trying to open
                if (deltaX < -threshold) {
                    element.style.transform = `translateX(${maxSwipe}px)`;
                    element.classList.add('swiped-left');
                } else {
                    element.style.transform = 'translateX(0)';
                    element.classList.remove('swiped-left');
                }
            } else {
                // Was opened, trying to close
                if (deltaX > threshold) {
                    element.style.transform = 'translateX(0)';
                    element.classList.remove('swiped-left');
                } else {
                    // Stay open
                    element.style.transform = `translateX(${maxSwipe}px)`;
                }
            }
        } else {
            // Click handling is preserved if no swipe
            // If it was open and we tapped it (not swipe), close it?
            if (isOpened && Math.abs(deltaX) < 5) {
                 element.style.transform = 'translateX(0)';
                 element.classList.remove('swiped-left');
            }
        }
        
        isSwiping = false;
    });
}

document.getElementById('dish-search').addEventListener('input', renderDishList);

// --- Confirm Delete Logic ---
function setupConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const deleteBtn = document.getElementById('confirm-delete-btn');

    cancelBtn.addEventListener('click', () => {
        hideModal('confirm-modal');
        dishToDeleteId = null;
    });

    deleteBtn.addEventListener('click', () => {
        if (dishToDeleteId) {
            deleteDish(dishToDeleteId);
        }
        hideModal('confirm-modal');
    });
}

function confirmDeleteDish(id) {
    dishToDeleteId = id;
    showModal('confirm-modal');
}

function deleteDish(id) {
    // 1. Remove from dishes array
    dishes = dishes.filter(d => d.id !== id);
    
    // 2. Remove from meal plans? (Optional: keep or remove. Better to remove to avoid stale refs)
    Object.keys(mealPlan).forEach(key => {
        const plan = mealPlan[key];
        if (Array.isArray(plan)) {
            mealPlan[key] = plan.filter(pid => pid !== id);
            if (mealPlan[key].length === 0) delete mealPlan[key];
        } else if (plan === id) {
            delete mealPlan[key];
        }
    });

    // 3. Save and Render
    saveData();
    renderDishList();
    renderPlanner();
    showToast('已删除');
}

// --- Dish Form ---
function openDishForm(id = null) {
    const modalTitle = document.getElementById('form-title');
    const nameInput = document.getElementById('dish-name');
    const ingInput = document.getElementById('dish-ingredients');
    const noteInput = document.getElementById('dish-notes');
    const stepsInput = document.getElementById('dish-steps');
    const idInput = document.getElementById('dish-id');
    
    // Reset
    nameInput.value = '';
    ingInput.value = '';
    noteInput.value = '';
    stepsInput.value = '';
    idInput.value = '';
    document.querySelectorAll('input[name="dish-type"]')[0].checked = true; // Default meat

    if (id) {
        const dish = dishes.find(d => d.id === id);
        if (dish) {
            modalTitle.innerText = '编辑菜品';
            idInput.value = dish.id;
            nameInput.value = dish.name;
            ingInput.value = dish.ingredients;
            noteInput.value = dish.notes;
            stepsInput.value = dish.steps || '';
            // Set radio
            const radio = document.querySelector(`input[name="dish-type"][value="${dish.type}"]`);
            if (radio) radio.checked = true;
        }
    } else {
        modalTitle.innerText = '添加新菜品';
    }
    
    showModal('dish-form-modal');
}

document.getElementById('save-dish-btn').addEventListener('click', () => {
    const id = document.getElementById('dish-id').value;
    const name = document.getElementById('dish-name').value.trim();
    const type = document.querySelector('input[name="dish-type"]:checked').value;
    const ings = document.getElementById('dish-ingredients').value;
    const notes = document.getElementById('dish-notes').value;
    const steps = document.getElementById('dish-steps').value;
    
    if (!name) { showToast('请输入菜名'); return; }
    
    const newDish = {
        id: id ? parseInt(id) : Date.now(),
        name, type, ingredients: ings, notes, steps
    };
    
    if (id) {
        const idx = dishes.findIndex(d => d.id == id);
        if (idx > -1) dishes[idx] = newDish;
    } else {
        dishes.push(newDish);
    }
    
    saveData();
    renderDishList();
    renderPlanner(); // Name might have changed
    hideModal('dish-form-modal');
    showToast('保存成功');
});

// --- Shopping List ---
function renderShoppingList() {
    const container = document.getElementById('shopping-list-container');
    const days = [
        {k:'thu', l:'周四'}, {k:'fri', l:'周五'}, {k:'sat', l:'周六'}
    ];
    
    container.innerHTML = '';
    let hasData = false;
    
    days.forEach(day => {
        const ings = {};
        ['lunch', 'dinner'].forEach(type => {
            const key = `${day.k}-${type}`;
            const ids = mealPlan[key];
            if (ids) {
                const idArr = Array.isArray(ids) ? ids : [ids];
                idArr.forEach(id => {
                    const d = dishes.find(x => x.id === id);
                    if (d && d.ingredients) {
                        d.ingredients.split(/[,，\s]+/).forEach(p => {
                            const name = p.trim();
                            if(name) ings[name] = (ings[name] || 0) + 1;
                        });
                    }
                });
            }
        });
        
        const names = Object.keys(ings).sort();
        if (names.length > 0) {
            hasData = true;
            const group = document.createElement('div');
            group.className = 'shopping-group';
            
            let html = `<div class="group-header">${day.l}采购</div>`;
            names.forEach(n => {
                const count = ings[n];
                html += `
                    <div class="shop-item">
                        <input type="checkbox">
                        <span>${n} ${count > 1 ? 'x'+count : ''}</span>
                    </div>
                `;
            });
            group.innerHTML = html;
            container.appendChild(group);
        }
    });
    
    if (!hasData) {
        container.innerHTML = '<div class="empty-state" style="text-align:center; color:#999; margin-top:50px;">暂无采购内容</div>';
    }
}

document.getElementById('copy-list-btn').addEventListener('click', () => {
    // Simple copy logic
    const groups = document.querySelectorAll('.shopping-group');
    let text = "🛒 采购清单\n";
    groups.forEach(g => {
        text += "\n" + g.querySelector('.group-header').innerText + "\n";
        g.querySelectorAll('.shop-item span').forEach(s => {
            text += "- " + s.innerText + "\n";
        });
    });
    navigator.clipboard.writeText(text).then(() => showToast('已复制'));
});

// --- Utilities ---
function saveData() {
    localStorage.setItem('menu_dishes', JSON.stringify(dishes));
    localStorage.setItem('menu_plan', JSON.stringify(mealPlan));
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2000);
}

function setupModals() {
    const closeBtns = document.querySelectorAll('.close-modal');
    closeBtns.forEach(btn => {
        btn.onclick = function() {
            this.closest('.modal').classList.add('hidden');
        }
    });
    
    window.onclick = (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
        }
    }
}

function showModal(id) { document.getElementById(id).classList.remove('hidden'); }
function hideModal(id) { document.getElementById(id).classList.add('hidden'); }
