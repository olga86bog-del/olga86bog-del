// --- ЗАПУСК: ЗАГРУЗКА ИЗ ОБЛАКА ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("Стучимся в базу данных...");
    
    // Спрашиваем у Google: "Какие сейчас настройки?"
    db.ref('settings').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log("✅ Настройки загружены из облака!");
                APP_CONFIG = data; // Применяем настройки из базы
            } else {
                console.log("⚠️ База пустая. Загружаю начальные данные...");
                // Если база пустая — отправляем туда наши дефолтные настройки
                db.ref('settings').set(APP_CONFIG);
            }
            startApp();
        })
        .catch((error) => {
            console.error("Ошибка базы:", error);
            alert("Не удалось загрузить настройки. Проверьте интернет.");
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

// --- УПРАВЛЕНИЕ СПИСКАМИ (ОБЛАКО) ---

function openManageMenu(key, selectId) {
    if (getSettings().role !== 'admin') return;
    currentManageKey = key;
    renderManageList();
    document.getElementById('manageModal').style.display = 'flex';
}

function renderManageList() {
    const modalSelect = document.getElementById('manageListSelect');
    modalSelect.innerHTML = '';
    getList(currentManageKey).forEach(item => modalSelect.add(new Option(item, item)));
}

function syncToCloud() {
    db.ref('settings').set(APP_CONFIG)
        .then(() => console.log("💾 Сохранено в Облако!"))
        .catch((err) => alert("Ошибка записи: " + err));
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
    const btnHTML = isAdmin 
        ? `<button onclick="openManageMenu('${configKey}', '${id}')" class="admin-add-btn no-print">+</button>` 
        : '';
    return `<div style="display:flex; align-items:center; width:100%; gap:5px;">
                <select id="${id}" style="flex-grow:1;" ${id==='equipment_select' ? 'onchange="checkDualTemp()"' : ''}></select>
                ${btnHTML}
            </div>`;
}

// --- ИНТЕРФЕЙС ---

const modalsHTML = `
<div id="loginModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3>Вход Админа</h3>
        <input type="password" id="inputPassword" placeholder="Пароль" style="width:100%; margin-bottom:15px; padding:10px;">
        <button onclick="checkLogin()" class="btn">Войти</button>
        <button onclick="closeModals()" class="btn btn-secondary">Отмена</button>
    </div>
</div>
<div id="changePassModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3>Смена пароля</h3>
        <input type="password" id="newPassword" placeholder="Новый пароль" style="width:100%; margin-bottom:15px;">
        <button onclick="saveNewCredentials()" class="btn">Сохранить</button>
        <button onclick="closeModals()" class="btn btn-secondary">Отмена</button>
    </div>
</div>
<div id="manageModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3 id="manageTitle">Управление</h3>
        <select id="manageListSelect" style="width:100%; padding:10px; margin-bottom:15px;"></select>
        <button onclick="manAdd()" class="btn btn-success">➕ Добавить</button>
        <button onclick="manEdit()" class="btn btn-warning">✏️ Изменить</button>
        <button onclick="manDel()" class="btn btn-danger">🗑️ Удалить</button>
        <button onclick="closeModals()" class="btn btn-secondary">Закрыть</button>
    </div>
</div>
`;

const homeView = () => {
    const s = getSettings();
    const arc = getArchive();
    return `<div class="home-card fade-in">
        <h1 class="main-title">PRONTO</h1><div class="subtitle">SPECS</div>
        <div style="font-size:10px; margin-bottom:20px;">РЕЖИМ: ${s.role.toUpperCase()}</div>
        <button onclick="createNewTZ()" class="btn" style="height:60px;">+ СОЗДАТЬ ТЗ</button>
        <button onclick="navigate('settings')" class="btn btn-secondary">НАСТРОЙКИ</button>
        <div style="margin-top:30px; text-align:left;">
            <h4>АРХИВ ПРОЕКТОВ</h4>
            ${arc.length ? arc.map((item, i) => `
                <div class="archive-item">
                    <div class="archive-info"><b>№ ${item.tz_no}</b><br>${item.eq}</div>
                    <div class="archive-controls">
                        <button onclick="editFromArchive(${i})" class="btn-tall btn-act-green">📂</button>
                        <button onclick="deleteFromArchive(${i})" class="btn-tall btn-act-red">🗑️</button>
                    </div>
                </div>`).join('') : '<p>Пусто</p>'}
        </div>
    </div>`;
};

const settingsView = () => {
    const s = getSettings();
    return `<div class="home-card fade-in">
        <h2>НАСТРОЙКИ</h2>
        <label>Роль:</label>
        <select id="role_select" onchange="handleRole(this)" style="margin-bottom:20px;">
            <option value="participant" ${s.role!=='admin'?'selected':''}>Участник</option>
            <option value="admin" ${s.role==='admin'?'selected':''}>Администратор</option>
        </select>
        <label>Тема:</label>
        <select id="theme_select">
            <option value="light" ${s.theme==='light'?'selected':''}>Светлая</option>
            <option value="dark" ${s.theme==='dark'?'selected':''}>Темная</option>
        </select>
        <button onclick="saveSettings()" class="btn" style="margin-top:20px;">СОХРАНИТЬ</button>
        ${modalsHTML}
    </div>`;
};

const templateView = () => `
    <div class="document-sheet fade-in">
        <div class="doc-header">
            <div><span style="font-size:20px; font-weight:bold;">ТЗ №</span> <input type="text" id="tz_no" style="font-size:20px; width:100px;"></div>
            <button onclick="navigate('home')" class="no-print">✕</button>
        </div>
        <div class="top-info-grid">
            <div><label>Оборудование</label>${renderSelect('equipment_select', 'equipment')}</div>
            <div><label>Кол-во</label><input type="number" id="qty" value="1"></div>
        </div>
        <table class="spec-table">
            <tr class="section-title"><td colspan="3">1. ГАБАРИТЫ</td></tr>
            <tr><td>1.1</td><td>В x Ш x Г</td><td><input type="number" id="h" style="width:60px"> x <input type="number" id="w" style="width:60px"> x <input type="number" id="d" style="width:60px"></td></tr>
            <tr class="section-title"><td colspan="3">2. ХАРАКТЕРИСТИКИ</td></tr>
            <tr><td>2.1</td><td>Материал</td><td>${renderSelect('mat', 'materials')}</td></tr>
            <tr><td>2.2</td><td>Охлаждение</td><td>${renderSelect('cool', 'coolingMethods')}</td></tr>
            <tr class="section-title"><td colspan="3">3. ЭСКИЗ</td></tr>
            <tr><td colspan="3">
                <textarea id="notes" style="width:100%; height:80px;" placeholder="Примечания..."></textarea>
                <div style="border:2px dashed #ccc; padding:20px; text-align:center; cursor:pointer;" onclick="document.getElementById('file_input').click()">
                    <img id="preview_img" style="max-width:100%; display:none;">
                    <span id="img_text">НАЖМИ ЧТОБЫ ДОБАВИТЬ ФОТО</span>
                    <input type="file" id="file_input" style="display:none;" onchange="handleFile(this)">
                </div>
            </td></tr>
        </table>
        <div class="footer-btns no-print">
            <button class="btn btn-success" onclick="saveToArchive()">💾 СОХРАНИТЬ</button>
            <button class="btn" onclick="window.print()">🖨️ ПЕЧАТЬ</button>
        </div>
        ${modalsHTML}
    </div>`;

function navigate(v) {
    document.getElementById('app').innerHTML = v==='template'?templateView():v==='settings'?settingsView():homeView();
    if(v==='template') { populateSelects(); checkDualTemp(); }
}

function populateSelects() {
    const map = {
        'equipment_select': 'equipment',
        'mat': 'materials',
        'cool': 'coolingMethods'
    };
    for(let id in map) {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = '';
            APP_CONFIG[map[id]].forEach(v => el.add(new Option(v,v)));
        }
    }
}

function checkDualTemp() {
    const el = document.getElementById('equipment_select');
    if(el && el.value.toLowerCase().includes('комби')) console.log("Dual mode");
}

function handleRole(el) { if(el.value==='admin') document.getElementById('loginModal').style.display='flex'; }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display='none'); }

function checkLogin() {
    if(document.getElementById('inputPassword').value === APP_CONFIG.adminPassword) {
        localStorage.setItem('pronto_settings', JSON.stringify({role:'admin', theme:getSettings().theme}));
        alert('Доступ разрешен!'); navigate('settings');
    } else alert('Неверно');
}

function saveSettings() {
    localStorage.setItem('pronto_settings', JSON.stringify({
        role: getSettings().role,
        theme: document.getElementById('theme_select').value
    }));
    applyTheme(); navigate('home');
}

function handleFile(input) {
    const f = input.files[0];
    if(f) {
        const r = new FileReader();
        r.onload = e => {
            uploadedImageBase64 = e.target.result;
            document.getElementById('preview_img').src = uploadedImageBase64;
            document.getElementById('preview_img').style.display = 'block';
            document.getElementById('img_text').style.display = 'none';
        };
        r.readAsDataURL(f);
    }
}

function saveToArchive() {
    const arc = getArchive();
    const data = {
        tz_no: document.getElementById('tz_no').value || '?',
        eq: document.getElementById('equipment_select').value,
        image: uploadedImageBase64,
        date: new Date().toLocaleDateString()
    };
    arc.unshift(data);
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
}

function deleteFromArchive(i) {
    const arc = getArchive(); arc.splice(i,1);
    localStorage.setItem('pronto_archive', JSON.stringify(arc)); navigate('home');
}

function createNewTZ() { uploadedImageBase64=null; navigate('template'); }

function editFromArchive(i) {
    const d = getArchive()[i]; navigate('template');
    setTimeout(() => {
        document.getElementById('tz_no').value = d.tz_no;
        document.getElementById('equipment_select').value = d.eq;
    }, 50);
}
    else {
        if(navigator.share) navigator.share({files: [new File([pdf.output('blob')], name, {type: 'application/pdf'})], title: 'ТЗ'});
    }

}
