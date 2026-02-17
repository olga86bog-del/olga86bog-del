// --- ЗАГРУЗКА ---
document.addEventListener("DOMContentLoaded", () => {
    db.ref('settings').once('value')
        .then((snapshot) => {
            if (snapshot.val()) APP_CONFIG = snapshot.val();
            else db.ref('settings').set(APP_CONFIG);
            startApp();
        })
        .catch((e) => {
            console.error("Ошибка базы:", e);
            startApp();
        });
});

function startApp() {
    const loader = document.getElementById('loader');
    if(loader) { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 500); }
    applyTheme(); navigate('home');
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

function syncToCloud() {
    db.ref('settings').set(APP_CONFIG).then(() => console.log("💾 Облако обновлено"));
}

// --- НАВИГАЦИЯ ---
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
    <div class="home-card">
        <h1 class="main-title">PRODUCTION</h1><div class="subtitle">SPECS</div>
        <button onclick="createNewTZ()" class="btn">+ СОЗДАТЬ НОВОЕ ТЗ</button>
        <button onclick="navigate('settings')" class="btn btn-secondary">НАСТРОЙКИ</button>
        <div style="margin-top:30px; text-align:left;">
            <h4>АРХИВ ПРОЕКТОВ</h4>
            ${arc.length ? arc.map((item, i) => `
                <div class="archive-item">
                    <div><b>№ ${item.tz_no}</b><br><small>${item.eq}</small></div>
                    <button onclick="deleteFromArchive(${i})" class="btn" style="width:40px; background:red; margin:0;">🗑️</button>
                </div>`).join('') : '<p>Архив пуст</p>'}
        </div>
    </div>`;
};

const settingsView = () => `
    <div class="home-card">
        <h2>НАСТРОЙКИ</h2>
        <button onclick="navigate('home')" class="btn btn-secondary">← НАЗАД</button>
    </div>`;

const templateView = () => `
    <div class="document-sheet">
        <div style="display:flex; justify-content:space-between;">
            <h2>ТЗ № <input type="text" id="tz_no" style="width:100px;"></h2>
            <button onclick="navigate('home')" style="border:none; background:none; font-size:24px; cursor:pointer;">✕</button>
        </div>
        <table class="spec-table">
            <tr class="section-title"><td colspan="2">1. ГАБАРИТЫ</td></tr>
            <tr><td>Оборудование</td><td>${renderSelect('equipment_select', 'equipment')}</td></tr>
            <tr><td>Высота (H)</td><td><input type="number" id="h" value="850"> мм</td></tr>
            <tr><td>Ширина (W)</td><td><input type="number" id="w" value="1200"> мм</td></tr>
            <tr><td>Глубина (D)</td><td><input type="number" id="d" value="700"> мм</td></tr>
            <tr class="section-title"><td colspan="2">2. ХАРАКТЕРИСТИКИ</td></tr>
            <tr><td>Материал</td><td>${renderSelect('mat', 'materials')}</td></tr>
            <tr><td>Охлаждение</td><td>${renderSelect('cool', 'coolingMethods')}</td></tr>
        </table>
        <div class="footer-btns">
            <button class="btn btn-success" onclick="saveToArchive()">💾 СОХРАНИТЬ</button>
            <button class="btn" onclick="window.print()">🖨️ ПЕЧАТЬ</button>
        </div>
    </div>`;

function renderSelect(id, key) {
    return `<select id="${id}">${APP_CONFIG[key].map(v => `<option value="${v}">${v}</option>`).join('')}</select>`;
}

function populateSelects() {}
function checkDualTemp() {}

function saveToArchive() {
    const arc = getArchive();
    arc.unshift({ 
        tz_no: document.getElementById('tz_no').value || '?', 
        eq: document.getElementById('equipment_select').value 
    });
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
}

function deleteFromArchive(i) {
    const arc = getArchive(); arc.splice(i,1);
    localStorage.setItem('pronto_archive', JSON.stringify(arc));
    navigate('home');
}

function createNewTZ() { uploadedImageBase64=null; navigate('template'); }
function applyTheme() {}
