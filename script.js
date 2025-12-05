// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    init();
    setupEventListeners();
});

// --- DOM要素の取得 ---
const viewHome = document.getElementById('view-home');
const viewResults = document.getElementById('view-search-results');
const homeInput = document.getElementById('home-input');
const resultInput = document.getElementById('result-input');
const listContainer = document.getElementById('result-list');
const noResultMsg = document.getElementById('no-result');
const resultCountSpan = document.getElementById('result-count');

// --- データ管理 ---
let termsData = [];
let currentCategory = 'all';
let currentQuery = '';

// --- 1. データ読み込み ---
async function init() {
    try {
        const response = await fetch('data.json?' + new Date().getTime());
        if (!response.ok) throw new Error('Network response was not ok');
        termsData = await response.json();
        console.log("データ読み込み成功:", termsData.length + "件");
    } catch (error) {
        console.error('Data Load Error:', error);
        if(listContainer) {
            listContainer.innerHTML = '<li style="color:red; padding:20px;">データの読み込みに失敗しました。</li>';
        }
    }
}

// --- 2. イベントリスナー設定 (ここを修正) ---
function setupEventListeners() {
    
    // ▼ ホーム画面: 検索実行 (Enterキー)
    if(homeInput) {
        homeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && homeInput.value.trim() !== "") {
                goToResults(homeInput.value);
            }
        });
    }

    // ▼ ホーム画面: 検索ボタン
    const homeSearchBtn = document.getElementById('home-search-btn');
    if(homeSearchBtn) {
        homeSearchBtn.addEventListener('click', () => {
            if (homeInput && homeInput.value.trim() !== "") {
                goToResults(homeInput.value);
            }
        });
    }

    // ▼ ホーム画面: 大きなカードボタン (.cat-card)
    const homeGrid = document.querySelector('.cat-grid');
    if(homeGrid) {
        homeGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.cat-card');
            if (card) {
                goToResults("", card.dataset.cat);
            }
        });
    }

    // ▼ ★重要修正: すべてのタグリスト (.categories-scroll) を監視する
    // HTML内に2箇所あるため、querySelectorAllですべて取得してループ処理します
    const allTagContainers = document.querySelectorAll('.categories-scroll');
    
    allTagContainers.forEach(container => {
        container.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (chip) {
                const selectedCat = chip.dataset.cat;
                
                // 今ホーム画面にいるなら、画面遷移が必要
                if (viewHome.classList.contains('active')) {
                    goToResults("", selectedCat);
                } else {
                    // すでに検索結果画面なら、リストを更新するだけ
                    currentCategory = selectedCat;
                    updateCategoryChips(currentCategory);
                    renderList();
                }
            }
        });
    });

    // ▼ 結果画面: 戻るボタン
    const backBtn = document.getElementById('back-btn');
    if(backBtn) backBtn.addEventListener('click', goToHome);

    // ▼ 結果画面: リアルタイム検索
    if(resultInput) {
        resultInput.addEventListener('input', (e) => {
            currentQuery = e.target.value;
            renderList();
        });
    }

    // ▼ 結果画面: リセットボタン
    const resetSearchBtn = document.getElementById('reset-search-btn');
    if(resetSearchBtn) {
        resetSearchBtn.addEventListener('click', () => goToResults("", "all"));
    }
}

// --- 3. 画面遷移関数 ---
function goToResults(query, category = 'all') {
    currentQuery = query;
    currentCategory = category;
    
    // 入力欄を同期
    if(resultInput) resultInput.value = query;
    if(homeInput) homeInput.value = query;

    // タグの見た目とリストを更新
    updateCategoryChips(category);
    renderList();

    // 画面切り替え
    if(viewHome) {
        viewHome.classList.remove('active');
        viewHome.classList.add('hidden');
    }
    if(viewResults) {
        viewResults.classList.remove('hidden');
        viewResults.classList.add('active');
    }
}

function goToHome() {
    if(homeInput) homeInput.value = '';
    if(resultInput) resultInput.value = '';
    
    if(viewResults) {
        viewResults.classList.remove('active');
        viewResults.classList.add('hidden');
    }
    if(viewHome) {
        viewHome.classList.remove('hidden');
        viewHome.classList.add('active');
    }
}

// --- 4. 描画ロジック ---
function renderList() {
    if(!listContainer) return;
    listContainer.innerHTML = '';
    
    const filtered = termsData.filter(item => {
        // A. カテゴリ判定
        let isCatMatch = false;
        if (currentCategory === 'all') {
            isCatMatch = true;
        } else if (item.tags && Array.isArray(item.tags)) {
            isCatMatch = item.tags.includes(currentCategory);
        } else if (item.category) {
            isCatMatch = item.category === currentCategory;
        }

        // B. キーワード判定
        const q = currentQuery.toLowerCase().trim();
        const term = item.term || '';
        const reading = item.reading || '';
        const keywords = item.keywords || '';

        // タグ名での検索対応
        let isTagMatch = false;
        if (item.tags && Array.isArray(item.tags)) {
            isTagMatch = item.tags.some(tag => tag.toLowerCase().includes(q));
        }

        const isTextMatch = !q || 
            term.toLowerCase().includes(q) || 
            reading.includes(q) || 
            keywords.toLowerCase().includes(q) ||
            isTagMatch;
            
        return isCatMatch && isTextMatch;
    });

    // 件数更新
    if(resultCountSpan) resultCountSpan.textContent = filtered.length;

    // 表示処理
    if (filtered.length === 0) {
        if(noResultMsg) noResultMsg.style.display = 'block';
    } else {
        if(noResultMsg) noResultMsg.style.display = 'none';
        
        filtered.forEach(item => {
            let badgesHtml = '';
            if (item.tags && Array.isArray(item.tags)) {
                badgesHtml = item.tags.map(tag => `<span class="category-badge" data-tag="${tag}">${tag}</span>`).join('');
            } else if (item.category) {
                badgesHtml = `<span class="category-badge" data-tag="${item.category}">${item.category}</span>`;
            }

            const li = document.createElement('li');
            li.className = 'item';
            li.innerHTML = `
                <div class="item-header-row">
                    <span class="term">${highlight(item.term, currentQuery)}<span class="reading">(${item.reading})</span></span>
                    <div class="badges-wrapper">${badgesHtml}</div>
                </div>
                <div class="description">${highlight(item.description, currentQuery)}</div>
            `;
            
            const tagsInfo = item.tags ? item.tags.join(', ') : (item.category || '');
            li.onclick = () => alert(`${item.term}\n[${tagsInfo}]\n\n${item.description}`);
            
            listContainer.appendChild(li);
        });
    }
}

// --- ヘルパー関数 ---
function updateCategoryChips(activeCat) {
    // 画面内にあるすべてのチップ(.chip)に対して処理を行う
    const allChips = document.querySelectorAll('.chip');
    allChips.forEach(chip => {
        if (chip.dataset.cat === activeCat) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
}

function highlight(text, query) {
    if (!query || !text) return text || '';
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="highlight-text">$1</mark>');
}