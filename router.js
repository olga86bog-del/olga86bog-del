// --- 1. ЗАПУСК И ОБЛАКО (ТВОЯ ЛОГИКА) ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("Стучимся в базу данных...");
    db.ref('settings').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log("✅ Настройки загружены из облака!");
                APP_CONFIG = data; 
            } else {
                console.log("⚠️ База пустая. Загружаю начальные данные...");
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
    if (loader) {
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

// --- СИНХРОНИЗАЦИЯ С GOOGLE ---
function syncToCloud() {
    db.ref('settings').set(APP_CONFIG)
        .then(() => console.log("💾 Изменения сохранены в Google!"))
        .catch((err) => console.error("Ошибка сохранения:", err));
}

function openManageMenu(key, selectId) {
    if (getSettings().role !== 'admin') return;
    currentManageKey = key;
    renderManageList();
    document.getElementById('manageModal').style.display = 'flex';
}

function renderManageList() {
    const modalSelect = document.getElementById('manageListSelect');
    if(modalSelect) {
        modalSelect.innerHTML = '';
        getList(currentManageKey).forEach(item => modalSelect.add(new Option(item, item)));
    }
}

function manAdd() {
    const val = prompt("Введите название нового пункта:");
    if (val && val.trim()) {
        APP_CONFIG[currentManageKey].push(val.trim());
        refreshAfterChange();
    }
}

function manEdit() {
    const modalSelect = document.getElementById('manageListSelect');
    const oldVal = modalSelect.value;
    if (!oldVal) return;
    const newVal = prompt("Изменить название:", oldVal);
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
    if (confirm(`Удалить пункт "${val}"?`)) {
        const idx = APP_CONFIG[currentManageKey].indexOf(val);
        if (idx !== -1) {
            APP_CONFIG[currentManageKey].splice(idx, 1);
            refreshAfterChange();
        }
    }
}

function refreshAfterChange() {
    renderManageList();
    populateSelects();
    syncToCloud();
}

function renderSelect(id, configKey) {
    const isAdmin = getSettings().role === 'admin';
    const btnHTML = isAdmin 
        ? `<button onclick="openManageMenu('${configKey}', '${id}')" class="admin-add-btn no-print" title="Управление">+</button>` 
        : '';
    return `<div style="display:flex; align-items:center; width:100%; gap:5px;">
                <select id="${id}" style="flex-grow:1;" ${id==='equipment_select' ? 'onchange="checkDualTemp()"' : ''}></select>
                ${btnHTML}
            </div>`;
}

const modalsHTML = `
<div id="loginModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3 style="margin-top:0; color:var(--pronto)">Вход Администратора</h3>
        <input type="password" id="inputPassword" placeholder="Пароль" style="width:100%; margin-bottom:15px; padding:10px;">
        <div style="display:flex; gap:10px; justify-content:center;">
            <button onclick="closeModals()" class="btn btn-secondary">Отмена</button>
            <button onclick="checkLogin()" class="btn">Войти</button>
        </div>
    </div>
</div>
<div id="changePassModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3 style="margin-top:0; color:var(--pronto)">Смена пароля</h3>
        <input type="text" id="newLogin" placeholder="Новый логин" style="width:100%; margin-bottom:10px;">
        <input type="password" id="newPassword" placeholder="Новый пароль" style="width:100%; margin-bottom:15px;">
        <div style="display:flex; gap:10px; justify-content:center;">
            <button onclick="closeModals()" class="btn btn-secondary">Отмена</button>
            <button onclick="saveNewCredentials()" class="btn">Сохранить</button>
        </div>
    </div>
</div>
<div id="manageModal" class="modal" style="display:none">
    <div class="modal-content">
        <h3 style="margin-top:0; color:var(--pronto)">Управление списком</h3>
        <select id="manageListSelect" style="width:100%; padding:10px; margin-bottom:20px; font-weight:bold;"></select>
        <div style="display:flex; flex-direction:column; gap:10px;">
            <button onclick="manAdd()" class="btn btn-success" style="margin:0;">➕ Добавить новый</button>
            <button onclick="manEdit()" class="btn btn-warning" style="margin:0;">✏️ Изменить выбранный</button>
            <button onclick="manDel()" class="btn btn-danger" style="margin:0;">🗑️ Удалить выбранный</button>
            <button onclick="closeModals()" class="btn btn-secondary" style="margin:0;">🚪 Выйти</button>
        </div>
    </div>
</div>
`;

const homeView = () => {
    const s = getSettings();
    const roleText = s.role === 'admin' ? 'АДМИНИСТРАТОР' : 'УЧАСТНИК';
    const archive = getArchive();
    
    return `<div class="home-card fade-in">
        <h1 class="main-title">PRODUCTION</h1><div class="subtitle">SPECS</div>
        <div style="font-weight:bold; color:var(--pronto); margin-bottom:20px; font-size:12px; letter-spacing:1px;">РЕЖИМ: ${roleText}</div>
        <div class="description-text"><p><strong>PRODUCTION SPECS</strong> — цифровая экосистема компании PRONTO.</p></div>
        <button onclick="createNewTZ()" class="btn" style="height:55px; font-size:15px;">+ СОЗДАТЬ НОВОЕ ТЗ</button>
        <button onclick="navigate('settings')" class="btn btn-secondary">НАСТРОЙКИ СИСТЕМЫ</button>
        <div style="margin-top:40px; text-align:left;">
            <h4 style="color:var(--pronto); border-bottom:2px solid #cbd5e0; padding-bottom:8px;">ПОСЛЕДНИЕ ПРОЕКТЫ</h4>
            <div>${archive.length ? archive.map((item, i) => `
                <div class="archive-item">
                    ${item.image ? `<img src="${item.image}" class="archive-thumb">` : `<div class="archive-thumb" style="display:flex; align-items:center; justify-content:center; font-size:20px;">📷</div>`}
                    <div class="archive-info"><b style="color:var(--pronto)">№ ${item.tz_no}</b><div style="font-size:12px;">${item.eq}</div><small style="color:#718096">${item.date} | ${item.manager}</small></div>
                    <div class="archive-controls">
                        <button onclick="deleteFromArchive(${i})" class="btn-tall btn-act-red">🗑️</button>
                        <button onclick="editFromArchive(${i})" class="btn-tall btn-act-green">📂</button>
                        <div class="btn-stack">
                            <button onclick="quickAction(${i}, 'pdf')" class="btn-mini">💾</button>
                            <button onclick="quickAction(${i}, 'share')" class="btn-mini">📤</button>
                        </div>
                    </div>
                </div>`).join('') : '<p style="color:#a0aec0; text-align:center;">Архив пуст</p>'}
            </div>
        </div>
    </div>`;
};

const settingsView = () => {
    const s = getSettings();
    const isAdmin = s.role === 'admin';
    return `<div class="home-card fade-in">
        <h1 style="color:var(--pronto); margin-bottom:30px;">НАСТРОЙКИ</h1>
        <div style="text-align:left; max-width:450px; margin:0 auto;">
            <div style="background:rgba(0,0,0,0.03); padding:20px; border-radius:10px; margin-bottom:20px; border:1px solid var(--border);">
                <label style="font-weight:bold; display:block; margin-bottom:10px;">👤 Роль пользователя</label>
                <select id="role_select" onchange="handleRole(this)" style="width:100%; padding:12px;">
                    <option value="participant" ${!isAdmin?'selected':''}>Участник</option>
                    <option value="admin" ${isAdmin?'selected':''}>Администратор</option>
                </select>
            </div>
            <div style="background:rgba(0,0,0,0.03); padding:20px; border-radius:10px; margin-bottom:20px; border:1px solid var(--border);">
                <label style="font-weight:bold; display:block; margin-bottom:10px;">🎨 Тема оформления</label>
                <select id="theme_select" style="width:100%; padding:12px;">
                    <option value="light" ${s.theme==='light'?'selected':''}>Светлая (День)</option>
                    <option value="dark" ${s.theme==='dark'?'selected':''}>Темная (Ночь)</option>
                </select>
            </div>
            ${isAdmin ? `
                <div style="border:2px dashed var(--pronto); padding:20px; border-radius:10px; margin-bottom:20px; text-align:center;">
                    <h4 style="margin-top:0; color:var(--pronto)">Панель Администратора</h4>
                    <p style="color:green; font-weight:bold; font-size:12px;">☁️ Облачная база активна</p>
                    <button onclick="document.getElementById('changePassModal').style.display='flex'" class="btn" style="background:#d69e2e">🔐 Сменить пароль</button>
                </div>
            ` : ''}
            <button onclick="saveSettings()" class="btn btn-secondary" style="margin-top:20px;">← СОХРАНИТЬ И ВЫЙТИ</button>
        </div>
        ${modalsHTML}
    </div>`;
};

const templateView = () => `
    <div class="document-sheet fade-in">
        <div class="doc-header">
            <div style="flex-grow:1;">
                <div style="font-size:12px; color:#94a3b8; font-weight:bold;">ТЕХНИЧЕСКОЕ ЗАДАНИЕ</div>
                <div style="display:flex; align-items:center;">
                    <span style="font-weight:900; color:var(--pronto); font-size:24px; margin-right:10px;">SPECS №</span>
                    <input type="text" id="tz_no" class="tz-number-input" placeholder="000-00">
                </div>
                <div style="margin-top:5px; font-size:13px;"><b>МЕНЕДЖЕР:</b> <input type="text" id="manager_name" style="border:none; border-bottom:1px solid #ccc; width:200px;" placeholder="Имя Фамилия"></div>
            </div>
            <button onclick="navigate('home')" class="no-print" style="background:none; border:none; font-size:28px; color:#cbd5e0; cursor:pointer;">✕</button>
        </div>
        <div class="top-info-grid">
            <div><label>ОБОРУДОВАНИЕ</label>${renderSelect('equipment_select', 'equipment')}</div>
            <div><label>ЕД. ИЗМ.</label><select id="unit"><option>шт.</option><option>компл.</option></select></div>
            <div><label>КОЛ-ВО</label><input type="number" id="qty" value="1"></div>
        </div>
        <table class="spec-table">
            <thead><tr><th width="40">№</th><th>ПАРАМЕТР</th><th>ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ</th></tr></thead>
            <tbody>
                <tr class="section-title"><td colspan="3">1. ВНЕШНИЕ ГАБАРИТЫ (мм)</td></tr>
                <tr><td>1.1</td><td>Высота (H)</td><td><div class="unit-box"><input type="number" id="val_1_1" value="850"><span>мм</span></div></td></tr>
                <tr><td>1.2</td><td>Ширина (W)</td><td><div class="unit-box"><input type="number" id="val_1_2" value="1200"><span>мм</span></div></td></tr>
                <tr><td>1.3</td><td>Глубина (D)</td><td><div class="unit-box"><input type="number" id="val_1_3" value="700"><span>мм</span></div></td></tr>
                <tr><td>1.4</td><td>Допуск</td><td><div class="unit-box"><span>±</span><input type="number" id="val_1_4" value="5"><span>мм</span></div></td></tr>
                <tr class="section-title"><td colspan="3">2. СПОСОБ ИСПОЛНЕНИЯ</td></tr>
                <tr><td>2.1</td><td>Материал / Тип</td><td><div style="display:flex; gap:10px;">${renderSelect('val_2_1_mat', 'materials')}${renderSelect('val_2_1_con', 'constructions')}</div></td></tr>
                <tr class="section-title"><td colspan="3">3. МЕТОД ОХЛАЖДЕНИЯ</td></tr>
                <tr><td>3.1</td><td>Тип системы</td><td>${renderSelect('val_3_1', 'coolingMethods')}</td></tr>
                <tr class="section-title"><td colspan="3">4. КОМПЛЕКТАЦИЯ</td></tr>
                <tr><td>4.1</td><td>Столешница</td><td><div style="display:flex; gap:10px;">${renderSelect('val_4_1', 'tabletops')}${renderSelect('val_4_1_mat', 'tabletopMaterials')}</div></td></tr>
                <tr><td>4.2</td><td>Гастроёмкости</td><td><div class="unit-box">${renderSelect('sel_4_2', 'gnTypes')}<span>гл.</span><input type="number" id="val_4_2" value="150" style="width:60px"><span>мм</span></div></td></tr>
                <tr class="comment-row"><td></td><td><small>Комментарий:</small></td><td><input type="text" class="comment-row input" id="comm_4_1"></td></tr>
                <tr><td>4.3</td><td>Количество GN</td><td><div class="unit-box"><input type="number" id="val_4_3" value="0"><span>шт.</span></div></td></tr>
                <tr><td>4.4</td><td>Двери</td><td><div class="unit-box">${renderSelect('sel_4_4', 'doorTypes')}<input type="number" id="val_4_4" value="2" style="width:60px"><span>шт.</span></div></td></tr>
                <tr><td>4.5</td><td>Ящики / Салазки</td><td><div class="compact-row">${renderSelect('sel_4_5', 'drawerTypes')}<input type="number" id="val_4_5" value="0"><span>шт.</span><b class="compact-sep">|</b>${renderSelect('val_4_5_slides', 'slideTypes')}<input type="number" id="val_4_5_slides_qty" value="0"><span>шт.</span></div></td></tr>
                <tr><td>4.6</td><td>Полки</td><td><div class="unit-box">${renderSelect('sel_4_6', 'shelfTypes')}<input type="number" id="val_4_6" value="2" style="width:60px"><span>шт.</span></div></td></tr>
                <tr><td>4.7</td><td>Нагрузка полки</td><td><div class="unit-box"><input type="number" id="val_4_7" value="40"><span>кг</span></div></td></tr>
                <tr><td>4.8</td><td>Подсветка</td><td>${renderSelect('val_4_8', 'lighting')}</td></tr>
                <tr class="comment-row"><td></td><td><small>Комментарий:</small></td><td><input type="text" class="comment-row input" id="comm_4_2"></td></tr>
                <tr><td>4.9</td><td>Ножки</td><td><div class="unit-box">${renderSelect('sel_4_9', 'legs')}<input type="number" id="val_4_9" value="4" style="width:60px"><span>шт.</span></div></td></tr>
                <tr><td>4.10</td><td>Колеса (торм.)</td><td><div class="unit-box">${renderSelect('sel_4_10', 'wheels')}<input type="number" id="val_4_10" value="2" style="width:60px"><span>шт.</span></div></td></tr>
                <tr><td>4.11</td><td>Колеса (б/торм)</td><td><div class="unit-box">${renderSelect('sel_4_11', 'wheels')}<input type="number" id="val_4_11" value="2" style="width:60px"><span>шт.</span></div></td></tr>
                <tr><td>4.12</td><td>Вентиляция</td><td>${renderSelect('val_4_12', 'ventilation')}</td></tr>
                <tr class="section-title"><td colspan="3">5. ТЕМПЕРАТУРА</td></tr>
                <tr><td>5.1</td><td>Режим в камере</td><td><div class="unit-box"><b>t°</b><input type="text" id="val_5_1" value="+2...+8" style="width:80px; text-align:center;"><div id="dual_temp_zone" style="display:none; align-items:center; margin-left:10px;"><b style="color:var(--pronto)">/ t°</b><input type="text" id="val_5_1_2" value="-18" style="width:80px; text-align:center;"></div></div></td></tr>
                <tr class="section-title"><td colspan="3">6. СРЕДА / 7. ГАРАНТИЯ / 8. СРОК</td></tr>
                <tr><td>6.1</td><td>T / Влажность</td><td><div class="unit-box"><span>до +</span><input type="number" id="val_6_1" value="32" style="width:50px"><span>/ до</span><input type="number" id="val_6_2" value="60" style="width:60px"><span>%</span></div></td></tr>
                <tr><td>7.1 / 8.1</td><td>Гарантия / Срок</td><td><div class="unit-box"><input type="number" id="val_7_1" value="12" style="width:50px"><span>мес. /</span><input type="number" id="val_8_1" value="10" style="width:50px"><span>лет</span></div></td></tr>
                <tr class="section-title break-before"><td colspan="3">9. ЭСКИЗ И ПРИМЕЧАНИЯ</td></tr>
                <tr><td colspan="3"><div class="split-field"><div class="split-left"><textarea id="val_9_1" placeholder="Примечания..."></textarea></div><div class="split-right"><div id="image_box" onclick="document.getElementById('file_input').click()"><img id="preview_img" src="" style="display:none;"><div id="img_text" class="no-print">ФОТО +</div><input type="file" id="file_input" style="display:none;" onchange="handleFile(this)"></div></div></div></td></tr>
            </tbody>
        </table>
        <div class="signature-block"><div class="sig-item"><span class="sig-title">ЗАКАЗЧИК:</span><div class="sig-line"></div></div><div class="sig-item"><span class="sig-title">ИСПОЛНИТЕЛЬ:</span><div class="sig-line"></div></div></div>
        <div class="footer-btns no-print">
            <button class="btn btn-success" onclick="saveToArchive()">💾 СОХРАНИТЬ</button>
            <button class="btn btn-secondary" onclick="handlePrintWithMode()">🖨️ ПЕЧАТЬ</button>
            <button class="btn" onclick="genPDF('download')">📄 PDF</button>
            <button class="btn" style="background:#2b6cb0" onclick="genPDF('share')">📤 ОТПРАВИТЬ</button>
        </div>
        ${modalsHTML}
    </div>`;

function navigate(v) {
    const app = document.getElementById('app');
    if(app) {
        app.innerHTML = v==='template'?templateView():v==='settings'?settingsView():homeView();
        if(v==='template') { populateSelects(); checkDualTemp(); }
    }
    window.scrollTo(0,0);
}

function populateSelects() {
    const keys = ['equipment', 'materials', 'constructions', 'coolingMethods', 'tabletops', 'tabletopMaterials', 'gnTypes', 'doorTypes', 'drawerTypes', 'slideTypes', 'shelfTypes', 'lighting', 'legs', 'wheels', 'wheels', 'ventilation'];
    const ids = ['equipment_select', 'val_2_1_mat', 'val_2_1_con', 'val_3_1', 'val_4_1', 'val_4_1_mat', 'sel_4_2', 'sel_4_4', 'sel_4_5', 'val_4_5_slides', 'sel_4_6', 'val_4_8', 'sel_4_9', 'sel_4_10', 'sel_4_11', 'val_4_12'];
    ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = '<option disabled selected>Выбор</option>';
            if (APP_CONFIG[keys[i]]) APP_CONFIG[keys[i]].forEach(v => el.add(new Option(v, v)));
        }
    });
}

function checkDualTemp() {
    const el = document.getElementById('equipment_select'); if(!el) return;
    const zone = document.getElementById('dual_temp_zone');
    if(zone) zone.style.display = el.value.toLowerCase().includes('комби') ? 'flex' : 'none';
}

function checkLogin() {
    if(document.getElementById('inputPassword').value === APP_CONFIG.adminPassword) {
        const roleSel = document.getElementById('role_select');
        if(roleSel) roleSel.value = 'admin'; closeModals(); alert('Вход выполнен');
    } else alert('Ошибка');
}

function saveNewCredentials() {
    const l = document.getElementById('newLogin').value.trim();
    const p = document.getElementById('newPassword').value.trim();
    if(p.length < 6) return alert('Мин. 6 символов');
    APP_CONFIG.adminLogin = l; APP_CONFIG.adminPassword = p;
    syncToCloud(); closeModals();
}

function handleRole(el) { if(el.value==='admin') { document.getElementById('loginModal').style.display='flex'; el.value='participant'; } }

function closeModals() { 
    const lM = document.getElementById('loginModal'); if(lM) lM.style.display='none';
    const cM = document.getElementById('changePassModal'); if(cM) cM.style.display='none';
    const mM = document.getElementById('manageModal'); if(mM) mM.style.display='none';
}

function saveSettings() {
    const roleSel = document.getElementById('role_select');
    const themeSel = document.getElementById('theme_select');
    localStorage.setItem('pronto_settings', JSON.stringify({
        role: roleSel ? roleSel.value : 'participant',
        theme: themeSel ? themeSel.value : 'light'
    }));
    applyTheme(); navigate('home');
}

function handleFile(input) {
    const f = input.files[0];
    if(f) {
        const r = new FileReader();
        r.onload = e => {
            uploadedImageBase64 = e.target.result;
            const img = document.getElementById('preview_img');
            const txt = document.getElementById('img_text');
            if(img) { img.src = uploadedImageBase64; img.style.display='block'; }
            if(txt) txt.style.display='none';
        };
        r.readAsDataURL(f);
    }
}

function saveToArchive() {
    const arc = getArchive();
    const data = {
        tz_no: document.getElementById('tz_no').value || 'Б/Н',
        manager: document.getElementById('manager_name').value || '-',
        eq: document.getElementById('equipment_select').value,
        date: new Date().toLocaleDateString(),
        image: uploadedImageBase64,
        fields: {}
    };
    document.querySelectorAll('input, select, textarea').forEach(el => { if(el.id && el.id !== 'file_input') data.fields[el.id] = el.value; });
    arc.unshift(data);
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
}

function editFromArchive(i) {
    const d = getArchive()[i]; navigate('template');
    setTimeout(() => {
        const tzNo = document.getElementById('tz_no'); if(tzNo) tzNo.value = d.tz_no;
        const mName = document.getElementById('manager_name'); if(mName) mName.value = d.manager;
        if(d.image) {
            uploadedImageBase64 = d.image;
            const img = document.getElementById('preview_img');
            const txt = document.getElementById('img_text');
            if(img) { img.src = d.image; img.style.display='block'; }
            if(txt) txt.style.display='none';
        }
        for(let k in d.fields) { if(document.getElementById(k)) document.getElementById(k).value = d.fields[k]; }
        checkDualTemp();
    }, 50);
}

function deleteFromArchive(i) {
    if(confirm('Удалить?')) {
        const arc = getArchive(); arc.splice(i, 1);
        localStorage.setItem('pronto_archive', JSON.stringify(arc)); navigate('home');
    }
}

function createNewTZ() { uploadedImageBase64=null; navigate('template'); }

function quickAction(i, action) {
    editFromArchive(i);
    setTimeout(() => {
        if(action === 'print') handlePrintWithMode();
        else if(action === 'pdf') genPDF('download');
        else if(action === 'share') genPDF('share');
    }, 500);
}

function togglePrintMode(active) {
    if (active) {
        document.querySelectorAll('select').forEach(sel => {
            if (sel.value === 'Выбор') {
                sel.dataset.ph = 'true'; sel.style.display='none';
                sel.parentNode.insertAdjacentHTML('beforeend', '<span class="print-rep">Нет</span>');
            }
        });
        const box = document.querySelector('.split-right');
        if (box && !uploadedImageBase64) box.style.display = 'none';
    } else {
        document.querySelectorAll('.print-rep').forEach(el => el.remove());
        document.querySelectorAll('[data-ph]').forEach(el => { el.style.display=''; delete el.dataset.ph; });
        const box = document.querySelector('.split-right');
        if (box) box.style.display = '';
    }
}

function handlePrintWithMode() {
    togglePrintMode(true); window.print(); setTimeout(() => togglePrintMode(false), 500);
}

async function genPDF(action) {
    togglePrintMode(true);
    const el = document.querySelector('.document-sheet');
    const fBtns = document.querySelector('.footer-btns');
    if(fBtns) fBtns.style.display='none';
    const canvas = await html2canvas(el, { scale: 2 });
    if(fBtns) fBtns.style.display='flex';
    togglePrintMode(false);
    const img = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
    pdf.addImage(img, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
    const name = `TZ_${document.getElementById('tz_no').value}.pdf`;
    if(action==='download') pdf.save(name);
    else if(navigator.share) {
        navigator.share({files: [new File([pdf.output('blob')], name, {type: 'application/pdf'})], title: 'ТЗ'});
    }
}
