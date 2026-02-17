// --- ЗАПУСК И ОБЛАКО ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("Стучимся в базу данных...");
    db.ref('settings').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log("✅ Облако загружено!");
                APP_CONFIG = data; 
            } else {
                console.log("⚠️ База пуста, сохраняем дефолтные списки...");
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

// --- СИНХРОНИЗАЦИЯ С ОБЛАКОМ ---
function syncToCloud() {
    db.ref('settings').set(APP_CONFIG)
        .then(() => console.log("💾 Облако обновлено"))
        .catch((err) => console.error("Ошибка записи:", err));
}

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

function manAdd() {
    const val = prompt("Добавить пункт:");
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

// --- ИНТЕРФЕЙС И ШАБЛОНЫ (ТВОИ ОРИГИНАЛЬНЫЕ) ---
const modalsHTML = `
<div id="loginModal" class="modal" style="display:none"><div class="modal-content"><h3>Вход Админа</h3><input type="password" id="inputPassword" placeholder="Пароль" style="width:100%; margin-bottom:15px; padding:10px;"><button onclick="checkLogin()" class="btn">Войти</button><button onclick="closeModals()" class="btn btn-secondary">Отмена</button></div></div>
<div id="manageModal" class="modal" style="display:none"><div class="modal-content"><h3>Управление списком</h3><select id="manageListSelect" style="width:100%; padding:10px; margin-bottom:20px;"></select><button onclick="manAdd()" class="btn btn-success">➕ Добавить</button><button onclick="manEdit()" class="btn btn-warning">✏️ Изменить</button><button onclick="manDel()" class="btn btn-danger">🗑️ Удалить</button><button onclick="closeModals()" class="btn btn-secondary">Выйти</button></div></div>
`;

const homeView = () => {
    const s = getSettings();
    const arc = getArchive();
    return `
    <div class="home-card fade-in">
        <h1 class="main-title">PRODUCTION</h1><div class="subtitle">SPECS</div>
        <div style="font-size:10px; margin-bottom:20px;">РЕЖИМ: ${s.role.toUpperCase()}</div>
        <button onclick="createNewTZ()" class="btn" style="height:60px;">+ СОЗДАТЬ НОВОЕ ТЗ</button>
        <button onclick="navigate('settings')" class="btn btn-secondary">НАСТРОЙКИ</button>
        <div style="margin-top:30px; text-align:left;">
            <h4>АРХИВ ПРОЕКТОВ</h4>
            ${arc.length ? arc.map((item, i) => `
                <div class="archive-item">
                    ${item.image ? `<img src="${item.image}" style="width:50px; height:50px; object-fit:cover; margin-right:10px;">` : ''}
                    <div style="flex-grow:1;"><b>№ ${item.tz_no}</b><br><small>${item.eq}</small></div>
                    <button onclick="deleteFromArchive(${i})" class="btn" style="width:40px; background:red; margin:0;">🗑️</button>
                </div>`).join('') : '<p>Архив пуст</p>'}
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
        <button onclick="saveSettings()" class="btn" style="margin-top:20px;">СОХРАНИТЬ</button>
        <button onclick="navigate('home')" class="btn btn-secondary">НАЗАД</button>
        ${modalsHTML}
    </div>`;
};

const templateView = () => `
    <div class="document-sheet fade-in">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid var(--pronto); padding-bottom:10px; margin-bottom:20px;">
            <h2>SPECS № <input type="text" id="tz_no" style="width:100px; font-size:24px; border:none; border-bottom:1px solid #ccc;"></h2>
            <button onclick="navigate('home')" style="border:none; background:none; font-size:28px; cursor:pointer; color:#ccc;">✕</button>
        </div>
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:10px; margin-bottom:20px; background:#f8fafc; padding:10px; border-radius:8px;">
            <div><label style="font-size:10px; font-weight:bold; color:#64748b;">ОБОРУДОВАНИЕ</label>${renderSelect('equipment_select', 'equipment')}</div>
            <div><label style="font-size:10px; font-weight:bold; color:#64748b;">КОЛ-ВО</label><input type="number" id="qty" value="1"></div>
        </div>
        <table class="spec-table">
            <thead><tr><th width="40">№</th><th>ПАРАМЕТР</th><th>ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ</th></tr></thead>
            <tbody>
                <tr class="section-title"><td colspan="3">1. ГАБАРИТЫ (мм)</td></tr>
                <tr><td>1.1</td><td>Высота (H)</td><td><input type="number" id="h" value="850"></td></tr>
                <tr><td>1.2</td><td>Ширина (W)</td><td><input type="number" id="w" value="1200"></td></tr>
                <tr><td>1.3</td><td>Глубина (D)</td><td><input type="number" id="d" value="700"></td></tr>
                <tr class="section-title"><td colspan="3">2. ИСПОЛНЕНИЕ</td></tr>
                <tr><td>2.1</td><td>Материал</td><td>${renderSelect('mat', 'materials')}</td></tr>
                <tr><td>2.2</td><td>Конструкция</td><td>${renderSelect('con', 'constructions')}</td></tr>
                <tr class="section-title"><td colspan="3">3. ОХЛАЖДЕНИЕ</td></tr>
                <tr><td>3.1</td><td>Тип системы</td><td>${renderSelect('cool', 'coolingMethods')}</td></tr>
                <tr class="section-title"><td colspan="3">4. ЭСКИЗ</td></tr>
                <tr><td colspan="3">
                    <textarea id="notes" style="width:100%; height:80px; margin-bottom:10px;" placeholder="Доп. требования..."></textarea>
                    <div style="border:2px dashed #cbd5e1; height:150px; display:flex; align-items:center; justify-content:center; cursor:pointer; overflow:hidden;" onclick="document.getElementById('file_input').click()">
                        <img id="preview_img" style="max-width:100%; display:none;">
                        <span id="img_text">📷 ДОБАВИТЬ ЭСКИЗ</span>
                        <input type="file" id="file_input" style="display:none;" onchange="handleFile(this)">
                    </div>
                </td></tr>
            </tbody>
        </table>
        <div class="footer-btns">
            <button class="btn btn-success" onclick="saveToArchive()">💾 СОХРАНИТЬ</button>
            <button class="btn" onclick="handlePrint()">🖨️ ПЕЧАТЬ</button>
            <button class="btn" style="background:#2b6cb0" onclick="genPDF('download')">📄 PDF</button>
        </div>
        ${modalsHTML}
    </div>`;

// --- ЛОГИКА ---
function navigate(v) {
    const app = document.getElementById('app');
    if(v==='template') app.innerHTML = templateView();
    else if(v==='settings') app.innerHTML = settingsView();
    else app.innerHTML = homeView();
    
    if(v==='template') { populateSelects(); checkDualTemp(); }
    window.scrollTo(0,0);
}

function populateSelects() {
    const map = { 'equipment_select': 'equipment', 'mat': 'materials', 'con': 'constructions', 'cool': 'coolingMethods' };
    for(let id in map) {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = '';
            APP_CONFIG[map[id]].forEach(v => el.add(new Option(v,v)));
        }
    }
}

function checkDualTemp() {}
function handleRole(el) { if(el.value==='admin') document.getElementById('loginModal').style.display='flex'; }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display='none'); }

function checkLogin() {
    if(document.getElementById('inputPassword').value === APP_CONFIG.adminPassword) {
        localStorage.setItem('pronto_settings', JSON.stringify({role:'admin', theme:'light'}));
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
            const img = document.getElementById('preview_img');
            img.src = uploadedImageBase64; img.style.display='block';
            document.getElementById('img_text').style.display='none';
        };
        r.readAsDataURL(f);
    }
}

function saveToArchive() {
    const arc = getArchive();
    arc.unshift({ 
        tz_no: document.getElementById('tz_no').value || '?', 
        eq: document.getElementById('equipment_select').value,
        image: uploadedImageBase64
    });
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
}

function deleteFromArchive(i) {
    const arc = getArchive(); arc.splice(i,1);
    localStorage.setItem('pronto_archive', JSON.stringify(arc)); navigate('home');
}

function createNewTZ() { uploadedImageBase64=null; navigate('template'); }
function handlePrint() { window.print(); }

async function genPDF(action) {
    const el = document.querySelector('.document-sheet');
    const canvas = await html2canvas(el, { scale: 2 });
    const img = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
    pdf.addImage(img, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
    pdf.save(`TZ_${document.getElementById('tz_no').value}.pdf`);
}
