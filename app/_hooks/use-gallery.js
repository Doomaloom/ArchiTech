"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import formatFileSize from "../_lib/format";

export default function useGallery({ onFilesIngested } = {}) {
  const [fileMeta, setFileMeta] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const objectUrlsRef = useRef([]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const ingestFiles = (fileList) => {
    const files = Array.from(fileList ?? []);
    if (!files.length) {
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length) {
      const previews = imageFiles.map((file) => {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.push(url);
        return { file, url };
      });
      setGallery((current) => [
        ...previews.map((preview) => preview.url),
        ...current,
      ]);
      setActiveIndex(0);
      const primary = previews[0];
      if (primary) {
        setFileMeta({
          name: primary.file.name,
          size: primary.file.size,
          previewUrl: primary.url,
        });
      }
    }

    if (onFilesIngested) {
      onFilesIngested(files);
    }
  };

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }
    ingestFiles(files);
    event.target.value = "";
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
    if (event.dataTransfer?.files?.length) {
      ingestFiles(event.dataTransfer.files);
    }
  };

  const handlePrevImage = () => {
    if (!gallery.length) {
      return;
    }
    setActiveIndex((current) =>
      (current - 1 + gallery.length) % gallery.length
    );
  };

  const handleNextImage = () => {
    if (!gallery.length) {
      return;
    }
    setActiveIndex((current) => (current + 1) % gallery.length);
  };

  const handleDeleteImage = () => {
    if (!gallery.length) {
      return;
    }
    const nextGallery = gallery.filter((_, index) => index !== activeIndex);
    setGallery(nextGallery);
    const nextIndex = nextGallery.length
      ? Math.min(activeIndex, nextGallery.length - 1)
      : 0;
    setActiveIndex(nextIndex);
    if (!nextGallery.length) {
      setFileMeta(null);
    }
  };

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

  return {
    state: {
      fileMeta,
      isDragging,
      gallery,
      activeIndex,
    },
    derived: {
      hasFile,
      dropTitle,
      dropMeta,
      fileSizeLabel,
      activePreview,
    },
    actions: {
      setActiveIndex,
      handleFileChange,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handlePrevImage,
      handleNextImage,
      handleDeleteImage,
    },
  };
}
