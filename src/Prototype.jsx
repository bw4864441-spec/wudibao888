import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  DownloadSimple,
  ImageSquare,
  LockKey,
  SlidersHorizontal,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import {
  BROWSER_DECODE_MESSAGE,
  processImage,
  revokeProcessedImage,
  validateImageFile,
} from "./lib/imageProcessor.js";

export function isPngFile(file) {
  return file?.type === "image/png";
}

export function formatBytes(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

export function shouldWarnLowConfidence(removeBackground, result) {
  return Boolean(
    removeBackground
    && result
    && result.backgroundConfidence !== null
    && result.backgroundConfidence < 0.72,
  );
}

export function formatInputType(file) {
  const subtype = file?.type?.split("/")[1]?.toLowerCase();
  if (subtype === "jpeg") return "JPG";
  if (subtype === "x-icon" || subtype === "vnd.microsoft.icon") return "ICO";
  if (subtype) return subtype.toUpperCase();
  return file?.name?.match(/\.([^.]+)$/)?.[1]?.toUpperCase() || "—";
}

function formatType(type) {
  return formatInputType({ type });
}

function outputExtension(type) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return "png";
}

export function outputFilename(file, type) {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]+/g, "-");
  return `${base || "l-design-image"}-60x60.${outputExtension(type)}`;
}

function FileMeta({ label, value }) {
  return (
    <div className="file-meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function Prototype() {
  const inputRef = useRef(null);
  const requestSequence = useRef(0);
  const [file, setFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceDimensions, setSourceDimensions] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [forcePng, setForcePng] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [tolerance, setTolerance] = useState(28);

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  useEffect(() => () => revokeProcessedImage(result), [result]);

  useEffect(() => {
    if (!file) return undefined;

    const sequence = ++requestSequence.current;
    const timer = window.setTimeout(async () => {
      setStatus("processing");
      setError("");
      setResult(null);

      try {
        const nextResult = await processImage(file, { forcePng, removeBackground, tolerance });
        if (sequence !== requestSequence.current) {
          revokeProcessedImage(nextResult);
          return;
        }
        setResult(nextResult);
        setStatus("ready");
      } catch (processingError) {
        if (sequence !== requestSequence.current) return;
        const knownMessages = [
          BROWSER_DECODE_MESSAGE,
          "无法将这张图片压缩到 10KB 以下。",
          "无法将这张图片以 PNG 格式压缩到 10KB 以下。",
          "浏览器无法生成图片。",
        ];
        setError(
          knownMessages.includes(processingError?.message)
            ? processingError.message
            : "图片可能已损坏，无法读取。请重新选择一张图片。",
        );
        setStatus("error");
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [file, forcePng, removeBackground, tolerance]);

  const acceptFile = (nextFile) => {
    const validation = validateImageFile(nextFile);
    if (!validation.ok) {
      setError(validation.message);
      setStatus("error");
      return;
    }

    requestSequence.current += 1;
    setFile(nextFile);
    setSourceUrl(URL.createObjectURL(nextFile));
    setSourceDimensions(null);
    setForcePng(true);
    setRemoveBackground(false);
    setTolerance(28);
    setError("");
    setStatus("processing");
  };

  const reset = () => {
    requestSequence.current += 1;
    setFile(null);
    setSourceUrl("");
    setSourceDimensions(null);
    setResult(null);
    setStatus("idle");
    setError("");
    setForcePng(false);
    setRemoveBackground(false);
    setTolerance(28);
    if (inputRef.current) inputRef.current.value = "";
  };

  const openPicker = () => inputRef.current?.click();

  const onInputChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) acceptFile(selectedFile);
    event.target.value = "";
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) acceptFile(droppedFile);
  };

  const downloadResult = () => {
    if (!result || !file) return;
    const link = document.createElement("a");
    link.href = result.url;
    link.download = outputFilename(file, result.type);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const sourceSize = sourceDimensions
    ? `${sourceDimensions.width} × ${sourceDimensions.height}`
    : "读取中";
  const lowConfidence = shouldWarnLowConfidence(removeBackground, result);

  return (
    <main className="image-tool">
      <header className="tool-header">
        <a className="tool-brand" href="#top" aria-label="L-Design 图片工具首页">
          <span className="tool-brand-mark">
            <img alt="" src="/assets/brand/lbank-design-logo.png" />
          </span>
          <span>L-Design</span>
        </a>
        <span className="tool-label">IMAGE UTILITY · 01</span>
      </header>

      <section className="tool-hero" id="top">
        <p className="eyebrow">60 × 60 PX · UNDER 10 KB</p>
        <h1>60 × 60，<br />刚刚好。</h1>
        <p className="hero-copy">拖入图片，自动生成小于 10KB 的标准图片。</p>
      </section>

      <section className={`tool-workspace ${file ? "has-file" : "is-empty"}`} aria-label="图片处理工作区">
        <input
          accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,.ico"
          className="file-input"
          onChange={onInputChange}
          ref={inputRef}
          type="file"
        />

        {!file ? (
          <div
            className={`dropzone ${isDragging ? "is-dragging" : ""}`}
            onClick={openPicker}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openPicker();
              }
            }}
            role="button"
            tabIndex="0"
          >
            <span className="dropzone-icon"><UploadSimple weight="bold" /></span>
            <strong>把图片拖到这里</strong>
            <span>或点击选择图片</span>
            <small>PNG / JPG / WebP / GIF / BMP / AVIF / ICO · 单张图片</small>
          </div>
        ) : (
          <>
            <div className="compare-grid">
              <article className="preview-card original-card">
                <header className="preview-card-header">
                  <div>
                    <span className="card-index">01</span>
                    <h2>原始图片</h2>
                  </div>
                  <button className="icon-button" onClick={reset} type="button">
                    <Trash weight="bold" />
                    <span>移除</span>
                  </button>
                </header>
                <div className="preview-stage source-stage">
                  <img
                    alt="原始图片预览"
                    onLoad={(event) => setSourceDimensions({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    })}
                    src={sourceUrl}
                  />
                </div>
                <footer className="preview-card-footer">
                  <FileMeta label="原始尺寸" value={`${sourceSize} px`} />
                  <FileMeta label="文件大小" value={formatBytes(file.size)} />
                  <FileMeta label="格式" value={formatInputType(file)} />
                </footer>
              </article>

              <span className="transform-arrow" aria-hidden="true"><ArrowRight weight="bold" /></span>

              <article className="preview-card result-card">
                <header className="preview-card-header">
                  <div>
                    <span className="card-index">02</span>
                    <h2>输出结果</h2>
                  </div>
                  <span className={`result-status ${status}`}>
                    {status === "ready" ? <CheckCircle weight="fill" /> : <span className="status-dot" />}
                    {status === "ready" ? "已完成" : status === "error" ? "处理失败" : "处理中"}
                  </span>
                </header>
                <div className="preview-stage checkerboard">
                  {result ? (
                    <img alt="60 × 60 输出预览" src={result.url} />
                  ) : status === "error" ? (
                    <div className="stage-message error-message"><ImageSquare /><span>无法生成预览</span></div>
                  ) : (
                    <div className="stage-message"><span className="spinner" /><span>正在压缩图片</span></div>
                  )}
                </div>
                <footer className="preview-card-footer">
                  <FileMeta label="输出尺寸" value="60 × 60 px" />
                  <FileMeta label="文件大小" value={result ? formatBytes(result.bytes) : "—"} />
                  <FileMeta label="格式" value={result ? formatType(result.type) : "—"} />
                </footer>
                <button
                  className="download-button"
                  disabled={status !== "ready"}
                  onClick={downloadResult}
                  type="button"
                >
                  <DownloadSimple weight="bold" />
                  下载图片
                </button>
              </article>
            </div>

            <section className="format-panel" aria-label="输出格式设置">
              <div className="format-panel-heading">
                <span className="control-icon"><ImageSquare weight="bold" /></span>
                <div>
                  <h2>输出格式</h2>
                  <p>开启后将图片转换为 PNG</p>
                </div>
              </div>
              <label className="switch-row">
                <span>转换为 PNG</span>
                <input
                  checked={forcePng}
                  onChange={(event) => setForcePng(event.target.checked)}
                  type="checkbox"
                />
                <span className="switch" aria-hidden="true"><span /></span>
              </label>
            </section>

            <section className={`background-panel ${!isPngFile(file) ? "is-disabled" : ""}`}>
              <div className="background-panel-heading">
                <span className="control-icon"><SlidersHorizontal weight="bold" /></span>
                <div>
                  <h2>背景移除</h2>
                  <p>{isPngFile(file) ? "去除纯色或近纯色背景" : "去背景仅支持 PNG 图片"}</p>
                </div>
              </div>

              {isPngFile(file) && (
                <>
                  <label className="switch-row">
                    <span>去除背景</span>
                    <input
                      checked={removeBackground}
                      onChange={(event) => setRemoveBackground(event.target.checked)}
                      type="checkbox"
                    />
                    <span className="switch" aria-hidden="true"><span /></span>
                  </label>
                  <label className={`tolerance-control ${!removeBackground ? "is-muted" : ""}`}>
                    <span className="tolerance-copy">
                      <span>容差</span>
                      <output>{tolerance}</output>
                    </span>
                    <input
                      aria-label="背景颜色容差"
                      disabled={!removeBackground}
                      max="80"
                      min="8"
                      onChange={(event) => setTolerance(Number(event.target.value))}
                      type="range"
                      value={tolerance}
                    />
                    <span className="range-labels"><span>精准</span><span>宽松</span></span>
                  </label>
                </>
              )}
            </section>
          </>
        )}
      </section>

      <div className="tool-feedback" aria-live="polite">
        {error && <p className="feedback-error">{error}</p>}
        {lowConfidence && !error && (
          <p className="feedback-warning">背景颜色不够统一，可以降低容差后重试。</p>
        )}
      </div>

      <footer className="tool-footer">
        <p><LockKey weight="bold" />图片仅在你的浏览器内处理，不会上传或存储。</p>
        {file && <button onClick={openPicker} type="button">重新选择图片</button>}
      </footer>
    </main>
  );
}
