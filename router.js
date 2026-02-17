// --- ЗАПУСК И СВЯЗЬ С ОБЛАКОМ ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("Стучимся в базу данных...");
    db.ref('settings').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log("✅ Данные из облака загружены!");
                APP_CONFIG = data; 
            } else {
                console.log("⚠️ База пуста. Сохраняем твои настройки...");
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

// --- ТВОИ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let currentEditIndex = null;
let uploadedImageBase64 = null;
let currentManageKey = null;

const getArchive = () => JSON.parse(localStorage.getItem('pronto_archive') || '[]');
const getSettings = () => JSON.parse(localStorage.getItem('pronto_settings') || '{"role":"participant", "theme":"light"}');

function applyTheme() {
    const s = getSettings();
    document.body.className = s.theme === 'dark' ? 'dark-theme' : '';
}

function syncToCloud() {
    db.ref('settings').set(APP_CONFIG)
        .then(() => console.log("💾 Синхронизировано с Google!"))
        .catch((err) => console.error("Ошибка сохранения:", err));
}

// --- ТВОИ ФУНКЦИИ УПРАВЛЕНИЯ (СИНХРОНИЗИРОВАННЫЕ) ---
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
    (APP_CONFIG[currentManageKey] || []).forEach(item => modalSelect.add(new Option(item, item)));
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
    if(document.getElementById('equipment_select')) populateSelects();
    syncToCloud();
}

function renderSelect(id, configKey) {
    const isAdmin = getSettings().role === 'admin';
    const btnHTML = isAdmin ? `<button onclick="openManageMenu('${configKey}', '${id}')" class="admin-add-btn no-print">+</button>` : '';
    return `<div style="display:flex; align-items:center; width:100%; gap:5px;"><select id="${id}" style="flex-grow:1;"></select>${btnHTML}</div>`;
}

// --- ТВОЙ ОРИГИНАЛЬНЫЙ ИНТЕРФЕЙС ---
const modalsHTML = `
<div id="loginModal" class="modal" style="display:none"><div class="modal-content"><h3>Вход Админа</h3><input type="password" id="inputPassword" placeholder="Пароль"><button onclick="checkLogin()" class="btn">Войти</button><button onclick="closeModals()" class="btn btn-secondary">Отмена</button></div></div>
<div id="manageModal" class="modal" style="display:none"><div class="modal-content"><h3>Управление</h3><select id="manageListSelect" style="width:100%; margin-bottom:15px;"></select><button onclick="manAdd()" class="btn btn-success">➕ Добавить</button><button onclick="manEdit()" class="btn btn-warning">✏️ Изменить</button><button onclick="manDel()" class="btn btn-danger">🗑️ Удалить</button><button onclick="closeModals()" class="btn btn-secondary">Выйти</button></div></div>
`;

function navigate(v) {
    const app = document.getElementById('app');
    if(v === 'home') app.innerHTML = homeView();
    else if(v === 'settings') app.innerHTML = settingsView();
    else if(v === 'template') app.innerHTML = templateView();
    if(v === 'template') { populateSelects(); checkDualTemp(); }
    window.scrollTo(0,0);
}

const homeView = () => {
    const arc = getArchive();
    return `
    <div class="home-card fade-in">
        <h1 class="main-title">PRODUCTION</h1><div class="subtitle">SPECS</div>
        <button onclick="navigate('template')" class="btn" style="height:60px;">+ СОЗДАТЬ НОВОЕ ТЗ</button>
        <button onclick="navigate('settings')" class="btn btn-secondary">НАСТРОЙКИ</button>
        <div style="margin-top:30px; text-align:left;">
            <h4>АРХИВ ПРОЕКТОВ</h4>
            ${arc.length ? arc.map((item, i) => `<div class="archive-item"><b>№ ${item.tz_no}</b> - ${item.eq} <button onclick="deleteFromArchive(${i})" class="btn-del">🗑️</button></div>`).join('') : '<p>Архив пуст</p>'}
        </div>
    </div>`;
};

const settingsView = () => {
    const s = getSettings();
    return `<div class="home-card"><h2>НАСТРОЙКИ</h2><select id="role_select" onchange="handleRole(this)"><option value="participant">Участник</option><option value="admin" ${s.role==='admin'?'selected':''}>Администратор</option></select><button onclick="saveSettings()" class="btn">СОХРАНИТЬ</button>${modalsHTML}</div>`;
};

const templateView = () => `
    <div class="document-sheet">
        <div class="doc-header">
            <div class="tz-title">SPECS № <input type="text" id="tz_no" style="width:120px;"></div>
            <button onclick="navigate('home')" class="no-print">✕</button>
        </div>
        <table class="spec-table">
            <tr class="section-title"><td colspan="3">1. ГАБАРИТЫ (мм)</td></tr>
            <tr><td>1.1</td><td>Высота (H)</td><td><input type="number" id="val_1_1" value="850"></td></tr>
            <tr><td>1.2</td><td>Ширина (W)</td><td><input type="number" id="val_1_2" value="1200"></td></tr>
            <tr><td>1.3</td><td>Глубина (D)</td><td><input type="number" id="val_1_3" value="700"></td></tr>
            <tr class="section-title"><td colspan="3">2. ИСПОЛНЕНИЕ</td></tr>
            <tr><td>2.1</td><td>Оборудование</td><td>${renderSelect('equipment_select', 'equipment')}</td></tr>
            <tr><td>2.2</td><td>Материал</td><td>${renderSelect('mat', 'materials')}</td></tr>
            <tr class="section-title"><td colspan="3">3. ЭСКИЗ</td></tr>
            <tr><td colspan="3">
                <div id="image_box" onclick="document.getElementById('file_input').click()" style="border:2px dashed #ccc; height:200px; display:flex; align-items:center; justify-content:center;">
                    <img id="preview_img" style="max-width:100%; display:none;">
                    <span id="img_text">📷 НАЖМИТЕ ДЛЯ ЗАГРУЗКИ</span>
                    <input type="file" id="file_input" style="display:none;" onchange="handleFile(this)">
                </div>
            </td></tr>
        </tbody>
        </table>
        <div class="footer-btns no-print">
            <button class="btn btn-success" onclick="saveToArchive()">💾 СОХРАНИТЬ</button>
            <button class="btn" onclick="window.print()">🖨️ ПЕЧАТЬ</button>
            <button class="btn" style="background:#2b6cb0" onclick="genPDF('download')">📄 PDF</button>
        </div>
        ${modalsHTML}
    </div>`;

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function populateSelects() {
    const map = { 'equipment_select': 'equipment', 'mat': 'materials' };
    for(let id in map) {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = '';
            (APP_CONFIG[map[id]] || []).forEach(v => el.add(new Option(v,v)));
        }
    }
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
    arc.unshift({ tz_no: document.getElementById('tz_no').value || '?', eq: document.getElementById('equipment_select').value, date: new Date().toLocaleDateString() });
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
}

function deleteFromArchive(i) {
    const arc = getArchive(); arc.splice(i,1);
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
}

function checkLogin() {
    if(document.getElementById('inputPassword').value === APP_CONFIG.adminPassword) {
        localStorage.setItem('pronto_settings', JSON.stringify({role:'admin', theme:'light'}));
        alert('Успех!'); navigate('settings');
    } else alert('Неверно');
}

function handleRole(el) { if(el.value==='admin') document.getElementById('loginModal').style.display='flex'; }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display='none'); }
function saveSettings() { navigate('home'); }
function createNewTZ() { uploadedImageBase64=null; navigate('template'); }
function checkDualTemp() {}
function applyTheme() {}

async function genPDF(action) {
    const el = document.querySelector('.document-sheet');
    const canvas = await html2canvas(el, { scale: 2 });
    const img = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
    pdf.addImage(img, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
    pdf.save(`TZ_${document.getElementById('tz_no').value}.pdf`);
}

