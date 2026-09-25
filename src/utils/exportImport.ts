import { CategoryItem } from "../types";
import { getAllPhotos, bulkImportPhotos } from "./db";

export interface BackupData {
  version: number;
  exportedAt: string;
  doneStatus: Record<string, boolean>;
  sectionCovers?: {
    kyyeu?: string;
    canhan?: string;
  };
  kyyeuData: CategoryItem[];
  canhanData: CategoryItem[];
  photos: Array<{
    poseKey: string;
    dataUrl: string;
    note?: string;
    createdAt?: number;
  }>;
}

// Convert Blob to Base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function exportAllData(
  kyyeuData: CategoryItem[],
  canhanData: CategoryItem[]
): Promise<void> {
  const doneStatus: Record<string, boolean> = {};

  // Extract all done keys from localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("done-")) {
      doneStatus[key.replace("done-", "")] = localStorage.getItem(key) === "true";
    }
  }

  // Extract all photos from IndexedDB
  const allPhotos = await getAllPhotos();
  const photosPayload: BackupData["photos"] = [];

  for (const photo of allPhotos) {
    try {
      const dataUrl = await blobToBase64(photo.blob);
      photosPayload.push({
        poseKey: photo.poseKey,
        dataUrl,
        note: photo.note || "",
        createdAt: photo.createdAt,
      });
    } catch (err) {
      console.warn("Failed to convert photo to base64", err);
    }
  }

  const sectionCovers = {
    kyyeu: localStorage.getItem("cover-section-kyyeu") || undefined,
    canhan: localStorage.getItem("cover-section-canhan") || undefined,
  };

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    doneStatus,
    sectionCovers,
    kyyeuData,
    canhanData,
    photos: photosPayload,
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `PosingArt_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importBackupData(file: File): Promise<{
  kyyeuData: CategoryItem[];
  canhanData: CategoryItem[];
  photoCount: number;
}> {
  const text = await file.text();
  const data: BackupData = JSON.parse(text);

  if (!data || !data.kyyeuData || !data.canhanData) {
    throw new Error("File sao lưu không đúng định dạng POSING ART HANDBOOK.");
  }

  // Restore done status to localStorage
  if (data.doneStatus) {
    Object.entries(data.doneStatus).forEach(([key, val]) => {
      localStorage.setItem(`done-${key}`, String(val));
    });
  }

  // Restore section covers if present
  if (data.sectionCovers) {
    if (data.sectionCovers.kyyeu) {
      localStorage.setItem("cover-section-kyyeu", data.sectionCovers.kyyeu);
    }
    if (data.sectionCovers.canhan) {
      localStorage.setItem("cover-section-canhan", data.sectionCovers.canhan);
    }
  }

  // Restore photos into IndexedDB
  let importedPhotos = 0;
  if (Array.isArray(data.photos) && data.photos.length > 0) {
    importedPhotos = await bulkImportPhotos(data.photos);
  }

  return {
    kyyeuData: data.kyyeuData,
    canhanData: data.canhanData,
    photoCount: importedPhotos,
  };
}

// Generate Offline Single-File HTML for Zalo/Snapdrop transfer
export function exportSingleFileHtml(
  kyyeuData: CategoryItem[],
  canhanData: CategoryItem[]
): void {
  const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>POSING — Sổ Tay Tạo Dáng Chụp Ảnh (Offline Edition)</title>
<style>
  :root {
    --bg: #fcfbfa; --card: #ffffff; --text: #1a1a1a; --text-dim: #71717a;
    --accent: #b8860b; --accent-light: #fef9ee; --border: #e4e4e7;
    --radius-lg: 20px; --radius-md: 14px; --shadow: 0 10px 25px -5px rgba(0,0,0,0.06);
    --done: #10b981;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #09090b; --card: #18181b; --text: #f4f4f5; --text-dim: #a1a1aa;
      --accent: #eab308; --accent-light: #27272a; --border: #27272a;
      --shadow: 0 10px 25px -5px rgba(0,0,0,0.4);
    }
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.5; padding-bottom: 80px;
  }
  .app-container { max-width: 600px; margin: 0 auto; padding: 16px 16px; }
  header { text-align: center; padding: 16px 0; position: relative; }
  header h1 { margin: 0; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px; }
  header p { margin: 4px 0 0; color: var(--text-dim); font-size: 0.85rem; }
  .back-btn {
    position: absolute; left: 0; top: 16px; background: var(--card); border: 1px solid var(--border);
    padding: 6px 14px; border-radius: 10px; font-weight: 600; cursor: pointer; color: var(--text);
  }
  .home-grid { display: grid; gap: 16px; margin-top: 16px; }
  .nav-card {
    position: relative; height: 180px; border-radius: var(--radius-lg); overflow: hidden;
    cursor: pointer; display: flex; align-items: flex-end; box-shadow: var(--shadow);
    border: 1px solid var(--border);
  }
  .nav-card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .nav-card .overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 20%, rgba(0,0,0,0.85) 100%); }
  .nav-card .content { position: relative; padding: 20px; color: white; }
  .nav-card h2 { margin: 0; font-size: 1.5rem; font-weight: 700; }
  .nav-card p { margin: 4px 0 0; opacity: 0.8; font-size: 0.85rem; }
  .search-box { margin: 16px 0; }
  .search-box input {
    width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border);
    background: var(--card); color: var(--text); font-size: 0.95rem; outline: none; box-shadow: var(--shadow);
  }
  .tabs {
    display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; margin: 0 -16px 16px; padding-left: 16px;
    scrollbar-width: none; position: sticky; top: 0; background: var(--bg); z-index: 10;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab-btn {
    flex: 0 0 auto; padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border);
    background: var(--card); color: var(--text-dim); font-weight: 600; cursor: pointer; font-size: 0.85rem;
  }
  .tab-btn.active { background: var(--text); color: var(--bg); border-color: var(--text); }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .pose-card {
    background: var(--card); border-radius: var(--radius-md); padding: 14px 12px;
    border: 1px solid var(--border); cursor: pointer; position: relative; transition: 0.2s;
    display: flex; flex-direction: column; align-items: center; text-align: center; box-shadow: var(--shadow);
  }
  .pose-card:active { transform: scale(0.97); }
  .pose-card.done { opacity: 0.45; filter: grayscale(0.8); border-style: dashed; }
  .pose-card.done::after {
    content: "✓ Đã chụp"; position: absolute; bottom: 8px; font-size: 0.65rem;
    font-weight: 700; color: var(--done); background: rgba(16,185,129,0.1);
    padding: 2px 6px; border-radius: 6px;
  }
  .pose-card b { font-size: 0.85rem; line-height: 1.3; display: block; margin-top: 6px; }
  .pose-card p { font-size: 0.72rem; color: var(--text-dim); margin: 3px 0 0; line-height: 1.25; }
  .badge {
    position: absolute; top: 6px; right: 6px; background: var(--accent); color: white;
    font-size: 0.65rem; padding: 2px 6px; border-radius: 10px; font-weight: 700; display: none;
  }
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    display: none; align-items: flex-end; z-index: 100; backdrop-filter: blur(6px);
  }
  .modal {
    background: var(--bg); width: 100%; max-height: 85vh; border-radius: 24px 24px 0 0;
    overflow-y: auto; padding: 24px 16px 40px; box-shadow: 0 -10px 30px rgba(0,0,0,0.2);
  }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .btn-done {
    width: 100%; padding: 14px; border-radius: 14px; border: none;
    background: var(--text); color: var(--bg); font-weight: 700; font-size: 0.95rem; margin: 16px 0;
    cursor: pointer;
  }
  .btn-done.is-done { background: var(--border); color: var(--text-dim); }
  .refs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
  .ref-item { aspect-ratio: 1/1; border-radius: 10px; overflow: hidden; position: relative; background: var(--border); }
  .ref-item img { width: 100%; height: 100%; object-fit: cover; }
  .ref-del {
    position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); color: white;
    border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 10px;
  }
  .ref-add {
    display: flex; align-items: center; justify-content: center; border: 2px dashed var(--border);
    color: var(--text-dim); cursor: pointer; font-size: 1.8rem; background: var(--card);
  }
</style>
</head>
<body>

<div class="app-container">
  <div id="view-home" class="view">
    <header>
      <h1>POSING</h1>
      <p>Sổ Tay Tạo Dáng Offline Chuyên Nghiệp</p>
    </header>
    <div class="home-grid">
      <div class="nav-card" onclick="showView('kyyeu')">
        <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600">
        <div class="overlay"></div>
        <div class="content">
          <h2>KỶ YẾU</h2>
          <p>Chuyên Biệt Nữ & Kỷ Yếu • Hướng Dẫn & Mẹo Chụp</p>
        </div>
      </div>
      <div class="nav-card" onclick="showView('canhan')">
        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600">
        <div class="overlay"></div>
        <div class="content">
          <h2>CÁ NHÂN</h2>
          <p>Nàng Thơ • Cảm Xúc • Dân Tộc • Streetwear</p>
        </div>
      </div>
      <div class="nav-card" style="border: 2px dashed var(--accent); background: var(--accent-light); justify-content: center; align-items: center; text-align: center; height: 120px;" onclick="showView('kyyeu')">
        <div style="font-size: 2rem; color: var(--accent); font-weight: bold; line-height: 1;">+</div>
        <h2 style="font-size: 1.1rem; color: var(--accent); margin: 4px 0 2px;">Thêm Ý Tưởng</h2>
        <p style="font-size: 0.75rem; color: var(--text-dim); margin: 0;">Bấm vào dáng để thêm ảnh tham khảo</p>
      </div>
    </div>
  </div>

  <div id="view-kyyeu" class="view" style="display:none">
    <header>
      <button class="back-btn" onclick="showView('home')">← Trang Chủ</button>
      <h1>KỶ YẾU</h1>
      <p>Danh mục tư thế ảnh kỷ yếu</p>
    </header>
    <div class="search-box">
      <input type="text" placeholder="Tìm kiếm dáng kỷ yếu..." oninput="searchPoses(this.value, 'grid-kyyeu')">
    </div>
    <div class="tabs" id="tabs-kyyeu"></div>
    <div class="grid" id="grid-kyyeu"></div>
  </div>

  <div id="view-canhan" class="view" style="display:none">
    <header>
      <button class="back-btn" onclick="showView('home')">← Trang Chủ</button>
      <h1>CÁ NHÂN</h1>
      <p>Tư thế nghệ thuật & Concept</p>
    </header>
    <div class="search-box">
      <input type="text" placeholder="Tìm kiếm concept cá nhân..." oninput="searchPoses(this.value, 'grid-canhan')">
    </div>
    <div class="tabs" id="tabs-canhan"></div>
    <div class="grid" id="grid-canhan"></div>
  </div>
</div>

<div class="modal-overlay" id="modalOverlay" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <div class="modal-header">
      <h2 id="mTitle" style="margin:0; font-size:1.1rem"></h2>
      <button onclick="closeModal()" style="border:none; background:none; font-size:1.4rem; color:var(--text-dim); cursor:pointer">✕</button>
    </div>
    <p id="mDesc" style="color:var(--text-dim); font-size:0.85rem; margin:6px 0 12px"></p>
    <div id="mTips" style="background:var(--accent-light); padding:10px 12px; border-radius:10px; font-size:0.8rem; margin-bottom:12px; display:none"></div>
    <button id="btnDone" class="btn-done" onclick="toggleDone()">Đánh dấu đã chụp xong</button>
    <div style="font-size:0.85rem; font-weight:700; margin:16px 0 8px">Ảnh Tham Khảo (Offline Lưu Trình Duyệt):</div>
    <div class="refs-grid" id="refsGrid"></div>
  </div>
</div>

<input type="file" id="fileInput" style="display:none" accept="image/*" multiple>

<script>
const DATA_KYYEU = ${JSON.stringify(kyyeuData)};
const DATA_CANHAN = ${JSON.stringify(canhanData)};

let currentPoseKey = "", db;
let currentType = 'kyyeu', currentCatIdx = 0;

const request = indexedDB.open("PosingArtDB", 1);
request.onupgradeneeded = e => {
  const store = e.target.result.createObjectStore("photos", { keyPath: "id", autoIncrement: true });
  store.createIndex("poseKey", "poseKey");
};
request.onsuccess = e => {
  db = e.target.result;
  renderTabs('kyyeu', DATA_KYYEU);
  renderTabs('canhan', DATA_CANHAN);
};

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  document.getElementById('view-' + id).style.display = 'block';
  window.scrollTo(0, 0);
}

function renderTabs(type, data) {
  const container = document.getElementById('tabs-' + type);
  container.innerHTML = '';
  data.forEach((cat, idx) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (idx === 0 ? ' active' : '');
    btn.textContent = cat.label;
    btn.onclick = () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGrid(type, idx);
    };
    container.appendChild(btn);
  });
  renderGrid(type, 0);
}

function renderGrid(type, catIdx) {
  currentType = type;
  currentCatIdx = catIdx;
  const grid = document.getElementById('grid-' + type);
  const data = type === 'kyyeu' ? DATA_KYYEU[catIdx] : DATA_CANHAN[catIdx];
  grid.innerHTML = '';

  data.poses.forEach((p, pIdx) => {
    const key = p.id || (type + '-' + catIdx + '-' + pIdx);
    const isDone = localStorage.getItem('done-' + key) === 'true';
    const card = document.createElement('div');
    card.className = 'pose-card' + (isDone ? ' done' : '');
    card.innerHTML = '<span class="badge" id="badge-' + key + '"></span>' +
      '<b>' + p.title + '</b>' +
      (p.desc ? '<p>' + p.desc + '</p>' : '');
    card.onclick = () => openModal(key, p.title, p.desc || "", p.tips);
    grid.appendChild(card);
  });

  // End card: Thêm ý tưởng
  const addCard = document.createElement('div');
  addCard.className = 'pose-card';
  addCard.style.border = '2px dashed var(--accent)';
  addCard.style.background = 'var(--accent-light)';
  addCard.innerHTML = '<span style="font-size:1.6rem; color:var(--accent); font-weight:800; line-height:1;">+</span>' +
    '<b style="color:var(--accent); margin-top:4px;">Thêm ý tưởng</b>' +
    '<p style="font-size:0.7rem; color:var(--text-dim);">Lưu ảnh mẫu vào máy</p>';
  addCard.onclick = () => {
    alert("Để thêm ảnh tham khảo vào dáng, bạn hãy bấm vào bất kỳ dáng nào trong danh sách và chọn 'Thêm ảnh tham khảo' để chọn ảnh từ điện thoại!");
  };
  grid.appendChild(addCard);

  updateBadges();
}

function searchPoses(val, gridId) {
  document.getElementById(gridId).querySelectorAll('.pose-card').forEach(c => {
    c.style.display = c.innerText.toLowerCase().includes(val.toLowerCase()) ? 'flex' : 'none';
  });
}

function openModal(key, title, desc, tips) {
  currentPoseKey = key;
  document.getElementById('mTitle').textContent = title;
  document.getElementById('mDesc').textContent = desc;

  const tipsEl = document.getElementById('mTips');
  if (tips && tips.length > 0) {
    tipsEl.innerHTML = '<strong>💡 Mẹo chụp:</strong><br>' + tips.join('<br>• ');
    tipsEl.style.display = 'block';
  } else {
    tipsEl.style.display = 'none';
  }

  const isDone = localStorage.getItem('done-' + key) === 'true';
  const btn = document.getElementById('btnDone');
  btn.textContent = isDone ? "✓ Đã chụp xong (Bấm để hủy)" : "Đánh dấu đã chụp xong";
  btn.className = 'btn-done' + (isDone ? ' is-done' : '');

  document.getElementById('modalOverlay').style.display = 'flex';
  renderRefs();
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

function toggleDone() {
  const current = localStorage.getItem('done-' + currentPoseKey) === 'true';
  localStorage.setItem('done-' + currentPoseKey, String(!current));
  closeModal();
  renderGrid(currentType, currentCatIdx);
}

function renderRefs() {
  const container = document.getElementById('refsGrid');
  container.innerHTML = '<div class="ref-item ref-add" onclick="document.getElementById(\\'fileInput\\').click()">+</div>';
  if (!db) return;

  const tx = db.transaction("photos", "readonly");
  tx.objectStore("photos").index("poseKey").getAll(currentPoseKey).onsuccess = e => {
    e.target.result.forEach(item => {
      const div = document.createElement('div');
      div.className = 'ref-item';
      div.innerHTML = '<img src="' + URL.createObjectURL(item.blob) + '"><button class="ref-del" onclick="deleteImg(' + item.id + ')">✕</button>';
      container.prepend(div);
    });
  };
}

document.getElementById('fileInput').onchange = e => {
  if (!db) return;
  const tx = db.transaction("photos", "readwrite");
  Array.from(e.target.files).forEach(f => tx.objectStore("photos").add({ poseKey: currentPoseKey, blob: f }));
  tx.oncomplete = () => { renderRefs(); updateBadges(); };
};

function deleteImg(id) {
  if (!db) return;
  const tx = db.transaction("photos", "readwrite");
  tx.objectStore("photos").delete(id);
  tx.oncomplete = () => { renderRefs(); updateBadges(); };
}

function updateBadges() {
  if (!db) return;
  db.transaction("photos", "readonly").objectStore("photos").getAll().onsuccess = e => {
    const counts = {};
    e.target.result.forEach(i => counts[i.poseKey] = (counts[i.poseKey] || 0) + 1);
    document.querySelectorAll('.badge').forEach(b => {
      const key = b.id.replace('badge-', '');
      if (counts[key]) {
        b.textContent = counts[key] + ' ảnh';
        b.style.display = 'block';
      } else {
        b.style.display = 'none';
      }
    });
  };
}
</script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "PosingArt_Handbook_Offline.html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
