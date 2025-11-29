// State
let dishes = JSON.parse(localStorage.getItem('menu_dishes')) || [
    { id: 1, name: '番茄炒蛋', type: 'veg', ingredients: '番茄, 鸡蛋, 葱', notes: '快手菜' },
    { id: 2, name: '红烧排骨', type: 'meat', ingredients: '排骨, 冰糖, 姜, 葱', notes: '爸爸爱吃' },
    { id: 3, name: '紫菜蛋花汤', type: 'soup', ingredients: '紫菜, 鸡蛋, 虾皮', notes: '饭后' }
];
let mealPlan = JSON.parse(localStorage.getItem('menu_plan')) || {};

// State for UI
let currentPlannerTarget = null; // { day: 'thu', type: 'lunch' }

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
        const card = document.createElement('div');
        card.className = 'dish-card';
        const icon = { meat:'🍖', veg:'🥬', soup:'🍲' }[dish.type];
        
        card.innerHTML = `
            <div class="dish-info" onclick="showDishPractice(${dish.id})">
                <h4><span class="dish-icon">${icon}</span>${dish.name}</h4>
                <div class="dish-meta">${dish.ingredients || '无食材信息'}</div>
            </div>
            <div class="dish-actions">
                <!-- Simple Edit Trigger -->
                <button class="btn-primary-outline" onclick="openDishForm(${dish.id})">编辑</button>
            </div>
        `;
        container.appendChild(card);
    });
}

document.getElementById('dish-search').addEventListener('input', renderDishList);

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

