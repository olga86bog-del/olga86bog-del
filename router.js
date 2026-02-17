// --- ЗАПУСК: ЗАГРУЗКА ИЗ ОБЛАКА ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("Стучимся в базу данных...");
    
    db.ref('settings').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log("✅ Настройки загружены!");
                APP_CONFIG = data; 
            } else {
                console.log("⚠️ База пустая. Сохраняю начальные данные...");
                db.ref('settings').set(APP_CONFIG);
            }
            startApp();
        })
        .catch((error) => {
            console.error("Ошибка базы:", error);
            startApp(); 
        });
});

function startApp() {
    const loader = document.getElementById('loader');
    if(loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }
    applyTheme();
    navigate('home');
}

let currentEditIndex = null;
let uploadedImageBase64 = null;
let currentManageKey = null;

const getArchive = () => JSON.parse(localStorage.getItem('pronto_archive') || '[]');
const getSettings = () => JSON.parse(localStorage.getItem('pronto_settings') || '{"role":"participant", "theme":"light"}');

function applyTheme() {
    const s = getSettings();
    document.body.className = s.theme === 'dark' ? 'dark-theme' : '';
}

function getList(key) { return APP_CONFIG[key] || []; }

// --- УПРАВЛЕНИЕ СПИСКАМИ ---
function openManageMenu(key, selectId) {
    if (getSettings().role !== 'admin') return;
    currentManageKey = key;
    renderManageList();
    document.getElementById('manageModal').style.display = 'flex';
}

function renderManageList() {
    const modalSelect = document.getElementById('manageListSelect');
    if(!modalSelect) return;
    modalSelect.innerHTML = '';
    getList(currentManageKey).forEach(item => modalSelect.add(new Option(item, item)));
}

function syncToCloud() {
    db.ref('settings').set(APP_CONFIG)
        .then(() => console.log("💾 Сохранено в Облако!"))
        .catch((err) => console.error("Ошибка записи:", err));
}

function manAdd() {
    const val = prompt("Добавить новый пункт:");
    if (val && val.trim()) {
        APP_CONFIG[currentManageKey].push(val.trim());
        refreshAfterChange();
    }
}

function manEdit() {
    const modalSelect = document.getElementById('manageListSelect');
    const oldVal = modalSelect.value;
    if (!oldVal) return;
    const newVal = prompt("Изменить:", oldVal);
    if (newVal && newVal.trim() && newVal !== oldVal) {
        const idx = APP_CONFIG[currentManageKey].indexOf(oldVal);
        if (idx !== -1) {
            APP_CONFIG[currentManageKey][idx] = newVal.trim();
            refreshAfterChange();
        }
    }
}

function manDel() {
    const modalSelect = document.getElementById('manageListSelect');
    const val = modalSelect.value;
    if (!val) return;
    if (confirm(`Удалить "${val}"?`)) {
        const idx = APP_CONFIG[currentManageKey].indexOf(val);
        if (idx !== -1) {
            APP_CONFIG[currentManageKey].splice(idx, 1);
            refreshAfterChange();
        }
    }
}

function refreshAfterChange() {
    renderManageList();
    if(document.getElementById('equipment_select')) populateSelects();
    syncToCloud();
}

function renderSelect(id, configKey) {
    const isAdmin = getSettings().role === 'admin';
    const btnHTML = isAdmin ? `<button onclick="openManageMenu('${configKey}', '${id}')" class="admin-add-btn no-print">+</button>` : '';
    return `<div style="display:flex; align-items:center; width:100%; gap:5px;"><select id="${id}" style="flex-grow:1;"></select>${btnHTML}</div>`;
}

// --- ИНТЕРФЕЙС ---
const modalsHTML = `
<div id="loginModal" class="modal" style="display:none"><div class="modal-content"><h3>Вход Админа</h3><input type="password" id="inputPassword" placeholder="Пароль" style="width:100%; margin-bottom:15px; padding:10px;"><button onclick="checkLogin()" class="btn">Войти</button><button onclick="closeModals()" class="btn btn-secondary">Отмена</button></div></div>
<div id="manageModal" class="modal" style="display:none"><div class="modal-content"><h3>Управление</h3><select id="manageListSelect" style="width:100%; padding:10px; margin-bottom:15px;"></select><button onclick="manAdd()" class="btn btn-success">➕ Добавить</button><button onclick="manEdit()" class="btn btn-warning">✏️ Изменить</button><button onclick="manDel()" class="btn btn-danger">🗑️ Удалить</button><button onclick="closeModals()" class="btn btn-secondary">Закрыть</button></div></div>
`;

function navigate(v) {
    const app = document.getElementById('app');
    if(!app) return;
    if(v==='home') app.innerHTML = homeView();
    else if(v==='settings') app.innerHTML = settingsView();
    else if(v==='template') app.innerHTML = templateView();
    if(v==='template') populateSelects();
}

const homeView = () => {
    const s = getSettings();
    const arc = getArchive();
    return `<div class="home-card"><h1>PRONTO</h1><div style="font-size:10px; margin-bottom:20px;">РЕЖИМ: ${s.role.toUpperCase()}</div><button onclick="navigate('template')" class="btn" style="height:60px;">+ СОЗДАТЬ ТЗ</button><button onclick="navigate('settings')" class="btn btn-secondary">НАСТРОЙКИ</button><div style="margin-top:30px; text-align:left;"><h4>АРХИВ</h4>${arc.length ? arc.map((item, i) => `<div class="archive-item"><b>№ ${item.tz_no}</b> - ${item.eq} <button onclick="deleteFromArchive(${i})" style="float:right">🗑️</button></div>`).join('') : '<p>Пусто</p>'}</div></div>`;
};

const settingsView = () => {
    const s = getSettings();
    return `<div class="home-card"><h2>НАСТРОЙКИ</h2><label>Роль:</label><select id="role_select" onchange="handleRole(this)"><option value="participant" ${s.role!=='admin'?'selected':''}>Участник</option><option value="admin" ${s.role==='admin'?'selected':''}>Администратор</option></select><button onclick="saveSettings()" class="btn" style="margin-top:20px;">СОХРАНИТЬ</button><button onclick="navigate('home')" class="btn btn-secondary">НАЗАД</button>${modalsHTML}</div>`;
};

const templateView = () => `<div class="document-sheet"><h2>ТЗ № <input type="text" id="tz_no" style="width:80px"></h2><label>Оборудование:</label>${renderSelect('equipment_select', 'equipment')}<br><label>Материал:</label>${renderSelect('mat', 'materials')}<br><div class="footer-btns"><button class="btn btn-success" onclick="saveToArchive()">💾 СОХРАНИТЬ</button><button class="btn btn-secondary" onclick="navigate('home')">ОТМЕНА</button></div>${modalsHTML}</div>`;

function populateSelects() {
    const eqs = document.getElementById('equipment_select');
    if(eqs) { eqs.innerHTML = ''; APP_CONFIG.equipment.forEach(v => eqs.add(new Option(v,v))); }
    const mats = document.getElementById('mat');
    if(mats) { mats.innerHTML = ''; APP_CONFIG.materials.forEach(v => mats.add(new Option(v,v))); }
}

function handleRole(el) { if(el.value==='admin') document.getElementById('loginModal').style.display='flex'; }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display='none'); }

function checkLogin() {
    if(document.getElementById('inputPassword').value === APP_CONFIG.adminPassword) {
        localStorage.setItem('pronto_settings', JSON.stringify({role:'admin', theme:'light'}));
        alert('Успех!'); navigate('settings');
    } else alert('Неверно');
}

function saveSettings() {
    const role = localStorage.getItem('pronto_settings') ? JSON.parse(localStorage.getItem('pronto_settings')).role : 'participant';
    localStorage.setItem('pronto_settings', JSON.stringify({role: role, theme: 'light'}));
    navigate('home');
}

function saveToArchive() {
    const arc = getArchive();
    arc.unshift({ tz_no: document.getElementById('tz_no').value || '?', eq: document.getElementById('equipment_select').value });
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
}

function deleteFromArchive(i) {
    const arc = getArchive(); arc.splice(i,1);
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
}

