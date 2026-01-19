"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes)) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

export default function ImageToSitePage() {
  const [fileMeta, setFileMeta] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const objectUrlsRef = useRef([]);

  const hasFile = Boolean(fileMeta);
  const dropTitle = hasFile
    ? "Image ready for conversion"
    : "Drop an image or click to browse";
  const dropMeta = hasFile
    ? "Drag a new file to replace the current one."
    : "PNG, JPG, WebP up to 12MB";
  const fileSizeLabel = useMemo(() => {
    if (!fileMeta) {
      return "";
    }
    return formatFileSize(fileMeta.size);
  }, [fileMeta]);

  const activePreview = gallery[activeIndex] ?? fileMeta?.previewUrl ?? null;

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFile = (file) => {
    if (!file) {
      setFileMeta(null);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(previewUrl);
    setFileMeta({
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl,
    });
    setGallery((prev) => [previewUrl, ...prev].slice(0, 6));
    setActiveIndex(0);
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    setTitle(baseName);
    setName(file.name);
    setDetails(file.type ? `File type: ${file.type}` : "File type: image");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    handleFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  };

  return (
    <div className="imageflow-shell">
      <div className="imageflow-panel">
        <div className="imageflow-layout">
          <section
            className={`imageflow-dropzone${hasFile ? " is-ready" : ""}${
              isDragging ? " is-dragging" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="imageflow-media-controls" aria-label="Image tools">
              <button
                className="imageflow-control-button"
                type="button"
                aria-label="Previous image"
                onClick={() =>
                  setActiveIndex((current) =>
                    current > 0 ? current - 1 : Math.max(gallery.length - 1, 0)
                  )
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M14 6l-6 6 6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                className="imageflow-control-button"
                type="button"
                aria-label="Zoom image"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle
                    cx="11"
                    cy="11"
                    r="6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M11 8v6M8 11h6M16.5 16.5L20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                className="imageflow-control-button"
                type="button"
                aria-label="Delete image"
                onClick={() => {
                  if (!gallery.length) {
                    return;
                  }
                  setGallery((prev) => {
                    const next = prev.filter((_, index) => index !== activeIndex);
                    setActiveIndex((current) =>
                      current > 0 ? current - 1 : 0
                    );
                    return next;
                  });
                  setFileMeta(null);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M6 7h12M9 7V5h6v2M9 10v7M12 10v7M15 10v7M7 7l1 13h8l1-13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                className="imageflow-control-button"
                type="button"
                aria-label="Next image"
                onClick={() =>
                  setActiveIndex((current) =>
                    gallery.length
                      ? (current + 1) % gallery.length
                      : current
                  )
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M10 6l6 6-6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <input
              id="imageflow-upload"
              className="imageflow-file-input"
              type="file"
              accept="image/*"
              aria-label="Upload image"
              onChange={handleFileChange}
            />
            <label className="imageflow-drop-content" htmlFor="imageflow-upload">
              {activePreview ? (
                <img
                  className="imageflow-preview"
                  src={activePreview}
                  alt="Uploaded preview"
                />
              ) : (
                <>
                  <span className="imageflow-drop-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M7 15l3-3 2 2 4-4 3 3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      <rect
                        x="4"
                        y="5"
                        width="16"
                        height="14"
                        rx="3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <circle cx="9" cy="9" r="1.6" fill="currentColor" />
                    </svg>
                  </span>
                  <span className="imageflow-drop-title">{dropTitle}</span>
                  <span className="imageflow-drop-meta">{dropMeta}</span>
                </>
              )}
            </label>
            <div className="imageflow-file-row">
              {hasFile ? (
                <div className="imageflow-file-chip">
                  <span className="imageflow-file-name">{fileMeta.name}</span>
                  <span className="imageflow-file-size">{fileSizeLabel}</span>
                </div>
              ) : (
                <span className="imageflow-file-empty">
                  Add an image to start the conversion.
                </span>
              )}
            </div>
          </section>

          <section className="imageflow-gallery" aria-label="Uploaded gallery">
            <div className="imageflow-gallery-header">
              <span className="imageflow-gallery-title">Gallery</span>
              <span className="imageflow-gallery-meta">
                {hasFile ? "Latest upload highlighted" : "Awaiting uploads"}
              </span>
            </div>
            <div className="imageflow-thumbs">
              {gallery.length ? (
                gallery.map((src, index) => (
                  <button
                    key={`thumb-${src}`}
                    className={`imageflow-thumb${
                      index === activeIndex ? " is-active" : ""
                    }`}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                  >
                    <img src={src} alt="" />
                  </button>
                ))
              ) : (
                <div className="imageflow-thumb is-empty" aria-hidden="true" />
              )}
            </div>
          </section>

          <aside className="imageflow-info">
            <div className="imageflow-info-header">
              <p className="imageflow-info-kicker">Image to Site</p>
              <h1 className="imageflow-info-title">Conversion details</h1>
              <p className="imageflow-info-subtitle">
                Keep the brief tight. We will take the upload and translate it
                into structure and components.
              </p>
            </div>
            <div className="imageflow-info-fields">
              <label className="imageflow-field">
                <span className="imageflow-field-label">Title</span>
                <input
                  className="imageflow-input-field"
                  type="text"
                  placeholder="Landing page"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label className="imageflow-field">
                <span className="imageflow-field-label">Name</span>
                <input
                  className="imageflow-input-field"
                  type="text"
                  placeholder="Aurora Studio"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="imageflow-field">
                <span className="imageflow-field-label">Details</span>
                <textarea
                  className="imageflow-textarea"
                  rows={6}
                  placeholder="Describe the layout, sections, and key elements."
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                />
              </label>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
