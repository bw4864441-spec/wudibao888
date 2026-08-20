import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  DownloadSimple,
  GridFour,
  MagnifyingGlass,
  PencilSimple,
  Shuffle,
  Trash,
  ArrowCounterClockwise,
  X,
} from "@phosphor-icons/react";
import { categories, icons } from "./data/icons.js";
import { filterIcons, scatterStyle } from "./lib/catalog.js";
import { applyIconEdits } from "./lib/iconEdits.js";

const DELETED_KEY = "l-design-icon:deleted";
const REPLACEMENTS_KEY = "l-design-icon:replacements";

function readStoredJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function fileToOptimizedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Invalid image"));
    };
    image.src = objectUrl;
  });
}

const labels = {
  en: {
    All: "All", BuyCrypto: "Buy Crypto", Spot: "Spot", Futures: "Futures", Earn: "Earn", CopyTrading: "Copy Trading", Campaigns: "Campaigns", Security: "Security",
    search: "Search icons", downloadAll: "Download all", download: "Download", icons: "icons",
    empty: "No icons found", emptyHint: "Try another keyword or category.", language: "Switch to Chinese",
    scatter: "Scatter view", grid: "Grid view", close: "Close preview", downloaded: "Download started",
    copyImage: "Copy image", copied: "Image copied", downloadPng: "Download PNG", description: "A polished 3D icon for interfaces, presentations, and creative projects.",
    replace: "Replace icon", delete: "Delete icon", deleteConfirm: "Delete this icon?", deleted: "Icon deleted", replaced: "Icon replaced", undo: "Undo", invalidImage: "Choose a PNG, JPEG, or WebP image.",
  },
  zh: {
    All: "全部", BuyCrypto: "买币", Spot: "现货", Futures: "合约", Earn: "理财", CopyTrading: "跟单", Campaigns: "活动", Security: "安全",
    search: "搜索图标", downloadAll: "全部下载", download: "下载", icons: "枚图标",
    empty: "没有找到图标", emptyHint: "试试其他关键词或分类。", language: "切换到英文",
    scatter: "散点视图", grid: "网格视图", close: "关闭预览", downloaded: "已开始下载",
    copyImage: "复制图片", copied: "图片已复制", downloadPng: "下载 PNG", description: "适用于界面、演示文稿与创意项目的精致 3D 图标。",
    replace: "替换图标", delete: "删除图标", deleteConfirm: "确定删除这个图标吗？", deleted: "图标已删除", replaced: "图标已替换", undo: "撤销", invalidImage: "请选择 PNG、JPEG 或 WebP 图片。",
  },
};

function triggerDownload(href, filename) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function iconToPngBlob(icon) {
  const response = await fetch(icon.src);
  const sourceBlob = await response.blob();
  const bitmap = await createImageBitmap(sourceBlob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function saveIcon(icon) {
  const blob = await iconToPngBlob(icon);
  const objectUrl = URL.createObjectURL(blob);
  triggerDownload(objectUrl, `l-design-icon-${icon.id}.png`);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function Prototype() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("scatter");
  const [language, setLanguage] = useState("en");
  const [selected, setSelected] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [deletedIds, setDeletedIds] = useState(() => readStoredJson(DELETED_KEY, []));
  const [replacements, setReplacements] = useState(() => readStoredJson(REPLACEMENTS_KEY, {}));
  const [undoDeleteId, setUndoDeleteId] = useState(null);
  const searchRef = useRef(null);
  const replaceInputRef = useRef(null);
  const replaceTargetRef = useRef(null);
  const t = labels[language];
  const editedIcons = useMemo(() => applyIconEdits(icons, deletedIds, replacements), [deletedIds, replacements]);
  const visibleIcons = useMemo(() => filterIcons(editedIcons, category, query), [editedIcons, category, query]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!selected) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  const showToast = () => {
    setToast(t.downloaded);
    window.setTimeout(() => setToast(""), 1800);
  };

  const downloadOne = async (icon) => {
    await saveIcon(icon);
    showToast();
  };

  const copyIcon = async (icon) => {
    const blob = await iconToPngBlob(icon);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    setToast(t.copied);
    window.setTimeout(() => setToast(""), 1800);
  };

  const downloadVisible = () => {
    visibleIcons.forEach((icon, index) => window.setTimeout(() => saveIcon(icon), index * 90));
    showToast();
  };

  const deleteIcon = (icon) => {
    if (!window.confirm(t.deleteConfirm)) return;
    const nextDeleted = [...new Set([...deletedIds, icon.id])];
    setDeletedIds(nextDeleted);
    localStorage.setItem(DELETED_KEY, JSON.stringify(nextDeleted));
    setSelected(null);
    setUndoDeleteId(icon.id);
    setToast(t.deleted);
  };

  const undoDelete = () => {
    if (!undoDeleteId) return;
    const nextDeleted = deletedIds.filter((id) => id !== undoDeleteId);
    setDeletedIds(nextDeleted);
    localStorage.setItem(DELETED_KEY, JSON.stringify(nextDeleted));
    setUndoDeleteId(null);
    setToast("");
  };

  const chooseReplacement = (icon) => {
    replaceTargetRef.current = icon.id;
    replaceInputRef.current?.click();
  };

  const replaceIcon = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      setToast(t.invalidImage);
      return;
    }

    try {
      const dataUrl = await fileToOptimizedDataUrl(file);
      const nextReplacements = { ...replacements, [replaceTargetRef.current]: dataUrl };
      setReplacements(nextReplacements);
      localStorage.setItem(REPLACEMENTS_KEY, JSON.stringify(nextReplacements));
      setSelected((current) => current?.id === replaceTargetRef.current ? { ...current, src: dataUrl, replaced: true } : current);
      setToast(t.replaced);
      window.setTimeout(() => setToast(""), 1800);
    } catch {
      setToast(t.invalidImage);
    }
  };

  return (
    <main className="icon-platform">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="LBank Design home">
          <span className="brand-logo"><img alt="" src="/assets/brand/lbank-design-logo.png" /></span>
          <span>L-Design</span>
        </a>

        <nav className={`category-dock ${searchOpen ? "is-searching" : ""}`} aria-label="Icon categories">
          <div className="category-list">
            {categories.map((item) => (
              <button
                className={category === item ? "active" : ""}
                key={item}
                onClick={() => setCategory(item)}
                type="button"
              >
                {t[item]}
              </button>
            ))}
          </div>
          <div className="search-shell">
            {searchOpen && (
              <input
                aria-label={t.search}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.search}
                ref={searchRef}
                type="search"
                value={query}
              />
            )}
            <button
              aria-label={searchOpen ? t.close : t.search}
              className="search-button"
              onClick={() => {
                if (searchOpen && query) setQuery("");
                else setSearchOpen((current) => !current);
              }}
              type="button"
            >
              {searchOpen ? <X /> : <MagnifyingGlass weight="bold" />}
            </button>
          </div>
        </nav>

        <div className="utilities">
          <div className="view-toggle" aria-label="View mode">
            <button aria-label={t.scatter} className={view === "scatter" ? "active" : ""} onClick={() => setView("scatter")} type="button">
              <Shuffle weight="bold" />
            </button>
            <button aria-label={t.grid} className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} type="button">
              <GridFour weight="bold" />
            </button>
          </div>
          <button className="language-button" aria-label={t.language} onClick={() => setLanguage(language === "en" ? "zh" : "en")} type="button">
            {language === "en" ? "简" : "EN"}
          </button>
        </div>
      </header>

      <section className={`icon-stage ${view}`} id="top" aria-live="polite">
        {visibleIcons.length ? visibleIcons.map((icon, index) => {
          const position = scatterStyle(index, visibleIcons.length);
          return (
            <button
              aria-label={language === "en" ? icon.name : icon.nameZh}
              className="icon-item"
              key={icon.id}
              onClick={() => setSelected(icon)}
              style={view === "scatter" ? {
                "--x": `${position.x}%`,
                "--y": `${position.y}%`,
                "--size": `${position.size}px`,
                "--rotation": `${position.rotation}deg`,
                "--delay": `${(index % 8) * -0.45}s`,
              } : undefined}
              type="button"
            >
              <img alt="" draggable="false" src={icon.src} />
              <span>{language === "en" ? icon.name : icon.nameZh}</span>
            </button>
          );
        }) : (
          <div className="empty-state">
            <MagnifyingGlass />
            <strong>{t.empty}</strong>
            <span>{t.emptyHint}</span>
          </div>
        )}
      </section>

      <input accept="image/png,image/jpeg,image/webp" className="replacement-input" onChange={replaceIcon} ref={replaceInputRef} type="file" />

      <div className="stage-meta"><strong>{visibleIcons.length}</strong> {t.icons}</div>

      <button className="download-all" disabled={!visibleIcons.length} onClick={downloadVisible} type="button">
        <DownloadSimple weight="bold" />
        <span>{t.downloadAll}</span>
      </button>

      {selected && (
        <div className="preview-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <section aria-labelledby="preview-title" aria-modal="true" className="preview-dialog" role="dialog">
            <button aria-label={t.close} className="close-button" onClick={() => setSelected(null)} type="button"><X /></button>
            <div className="preview-image"><img alt="" src={selected.src} /></div>
            <div className="preview-footer">
              <div className="preview-info">
                <h1 id="preview-title">{language === "en" ? selected.name : selected.nameZh}</h1>
                <div className="preview-tags">
                  <span>{t[selected.category]}</span>
                  <span>3D</span>
                  <span>PNG</span>
                </div>
                <p>{t.description}</p>
              </div>
              <div className="preview-actions">
                <button className="secondary" onClick={() => copyIcon(selected)} type="button"><Copy weight="bold" />{t.copyImage}</button>
                <button className="primary" onClick={() => downloadOne(selected)} type="button"><DownloadSimple weight="bold" />{t.downloadPng}</button>
                <button className="outline" onClick={downloadVisible} type="button"><DownloadSimple weight="bold" />{t.downloadAll} {visibleIcons.length}</button>
                <div className="preview-manage-actions">
                  <button className="manage" onClick={() => chooseReplacement(selected)} type="button"><PencilSimple weight="bold" />{t.replace}</button>
                  <button className="manage danger" onClick={() => deleteIcon(selected)} type="button"><Trash weight="bold" />{t.delete}</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><Check weight="bold" />{toast}{undoDeleteId && <button onClick={undoDelete} type="button"><ArrowCounterClockwise weight="bold" />{t.undo}</button>}</div>}
      <a className="license-link" href="/licenses/fluent-emoji-3d-README.md" target="_blank" rel="noreferrer">MIT assets</a>
    </main>
  );
}
