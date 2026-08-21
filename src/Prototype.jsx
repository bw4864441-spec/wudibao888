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
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { assetPath, categories, icons } from "./data/icons.js";
import { filterIcons, scatterStyle } from "./lib/catalog.js";
import { createSharedCatalogCommit } from "./lib/githubCatalogCommit.js";
import { applyIconEdits } from "./lib/iconEdits.js";
import { hydrateSharedIcons, mergeSharedIcons, sharedCatalogUrl } from "./lib/sharedCatalog.js";
import { prepareUploadEntry } from "./lib/uploadPreparation.js";

const DELETED_KEY = "l-design-icon:deleted";
const REPLACEMENTS_KEY = "l-design-icon:replacements";
const brandLogoSrc = assetPath(import.meta.env.BASE_URL, "brand", "lbank-design-logo", "png");

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
    upload: "Upload icons", uploadTo: "Upload to", chooseFiles: "Choose images", uploadToken: "GitHub fine-grained token", uploadHint: "The token is used once and is never saved.", publish: "Publish icons", publishing: "Publishing...", cancel: "Cancel", uploadEmpty: "Choose at least one image.", uploadFailed: "Unable to publish icons.", publishStarted: "Publishing started. Icons will appear for everyone after deployment.",
  },
  zh: {
    All: "全部", BuyCrypto: "买币", Spot: "现货", Futures: "合约", Earn: "理财", CopyTrading: "跟单", Campaigns: "活动", Security: "安全",
    search: "搜索图标", downloadAll: "全部下载", download: "下载", icons: "枚图标",
    empty: "没有找到图标", emptyHint: "试试其他关键词或分类。", language: "切换到英文",
    scatter: "散点视图", grid: "网格视图", close: "关闭预览", downloaded: "已开始下载",
    copyImage: "复制图片", copied: "图片已复制", downloadPng: "下载 PNG", description: "适用于界面、演示文稿与创意项目的精致 3D 图标。",
    replace: "替换图标", delete: "删除图标", deleteConfirm: "确定删除这个图标吗？", deleted: "图标已删除", replaced: "图标已替换", undo: "撤销", invalidImage: "请选择 PNG、JPEG 或 WebP 图片。",
    upload: "上传图标", uploadTo: "上传至", chooseFiles: "选择图片", uploadToken: "GitHub Fine-grained Token", uploadHint: "令牌仅用于本次提交，不会被保存。", publish: "发布图标", publishing: "正在发布...", cancel: "取消", uploadEmpty: "请至少选择一张图片。", uploadFailed: "图标发布失败。", publishStarted: "已开始发布，部署完成后所有访问者都能看到图标。",
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
  const [sharedCatalogEntries, setSharedCatalogEntries] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState(null);
  const [uploadEntries, setUploadEntries] = useState([]);
  const [uploadToken, setUploadToken] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("idle");
  const searchRef = useRef(null);
  const replaceInputRef = useRef(null);
  const replaceTargetRef = useRef(null);
  const uploadInputRef = useRef(null);
  const t = labels[language];
  const sharedIcons = useMemo(
    () => hydrateSharedIcons(import.meta.env.BASE_URL, sharedCatalogEntries),
    [sharedCatalogEntries],
  );
  const catalogIcons = useMemo(() => mergeSharedIcons(icons, sharedIcons), [sharedIcons]);
  const editedIcons = useMemo(() => applyIconEdits(catalogIcons, deletedIds, replacements), [catalogIcons, deletedIds, replacements]);
  const visibleIcons = useMemo(() => filterIcons(editedIcons, category, query), [editedIcons, category, query]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    let active = true;
    fetch(sharedCatalogUrl(import.meta.env.BASE_URL))
      .then((response) => response.ok ? response.json() : { icons: [] })
      .then((catalog) => {
        if (active && Array.isArray(catalog.icons)) setSharedCatalogEntries(catalog.icons);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

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

  const openUpload = () => {
    setUploadCategory(category);
    setUploadEntries([]);
    setUploadToken("");
    setUploadError("");
    setUploadStatus("idle");
    setUploadOpen(true);
  };

  const closeUpload = () => {
    if (uploadStatus === "publishing") return;
    setUploadOpen(false);
  };

  const chooseUploadFiles = () => uploadInputRef.current?.click();

  const prepareUploads = async (event) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length || !uploadCategory) return;

    const results = await Promise.allSettled(
      files.map((file, index) => prepareUploadEntry(file, uploadCategory, sharedCatalogEntries.length + index)),
    );
    const preparedEntries = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
    const failedCount = results.length - preparedEntries.length;
    setUploadEntries(preparedEntries);
    setUploadError(failedCount ? t.invalidImage : "");
  };

  const updateUploadName = (id, name) => {
    setUploadEntries((entries) => entries.map((entry) => entry.id === id ? { ...entry, name, nameZh: name } : entry));
  };

  const publishUploads = async () => {
    if (!uploadEntries.length) {
      setUploadError(t.uploadEmpty);
      return;
    }
    if (!uploadToken.trim()) {
      setUploadError(t.uploadToken);
      return;
    }

    setUploadStatus("publishing");
    setUploadError("");
    const nextCatalogIcons = [
      ...sharedCatalogEntries,
      ...uploadEntries.map(({ content, src, ...icon }) => icon),
    ];

    try {
      await createSharedCatalogCommit({
        token: uploadToken.trim(),
        entries: uploadEntries,
        catalog: { icons: nextCatalogIcons },
      });
      setSharedCatalogEntries(nextCatalogIcons);
      setUploadOpen(false);
      setUploadEntries([]);
      setUploadToken("");
      setUploadStatus("idle");
      setToast(t.publishStarted);
      window.setTimeout(() => setToast(""), 4200);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : t.uploadFailed);
      setUploadStatus("idle");
    }
  };

  return (
    <main className="icon-platform">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="LBank Design home">
          <span className="brand-logo"><img alt="" src={brandLogoSrc} /></span>
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
          {category !== "All" && (
            <button aria-label={t.upload} className="upload-button" onClick={openUpload} type="button">
              <UploadSimple weight="bold" />
            </button>
          )}
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
      <input accept="image/png,image/jpeg,image/webp" className="replacement-input" multiple onChange={prepareUploads} ref={uploadInputRef} type="file" />

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

      {uploadOpen && (
        <div className="upload-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeUpload()}>
          <section aria-labelledby="upload-title" aria-modal="true" className="upload-dialog" role="dialog">
            <button aria-label={t.close} className="upload-close" disabled={uploadStatus === "publishing"} onClick={closeUpload} type="button"><X /></button>
            <header>
              <p>{t.uploadTo} {t[uploadCategory]}</p>
              <h1 id="upload-title">{t.upload}</h1>
            </header>
            <button className="file-picker" onClick={chooseUploadFiles} type="button"><UploadSimple weight="bold" />{t.chooseFiles}</button>
            {uploadEntries.length > 0 && (
              <div className="upload-list">
                {uploadEntries.map((entry) => (
                  <label className="upload-entry" key={entry.id}>
                    <img alt="" src={entry.src} />
                    <input aria-label={entry.name} onChange={(event) => updateUploadName(entry.id, event.target.value)} value={entry.name} />
                  </label>
                ))}
              </div>
            )}
            <label className="token-field">
              <span>{t.uploadToken}</span>
              <input autoComplete="new-password" onChange={(event) => setUploadToken(event.target.value)} placeholder="github_pat_..." type="password" value={uploadToken} />
              <small>{t.uploadHint}</small>
            </label>
            {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
            <footer>
              <button className="upload-cancel" disabled={uploadStatus === "publishing"} onClick={closeUpload} type="button">{t.cancel}</button>
              <button className="upload-publish" disabled={uploadStatus === "publishing" || !uploadEntries.length || !uploadToken.trim()} onClick={publishUploads} type="button">
                <UploadSimple weight="bold" />{uploadStatus === "publishing" ? t.publishing : t.publish}
              </button>
            </footer>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><Check weight="bold" />{toast}{undoDeleteId && <button onClick={undoDelete} type="button"><ArrowCounterClockwise weight="bold" />{t.undo}</button>}</div>}
      <a className="license-link" href="/licenses/fluent-emoji-3d-README.md" target="_blank" rel="noreferrer">MIT assets</a>
    </main>
  );
}
