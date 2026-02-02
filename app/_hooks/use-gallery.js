"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import formatFileSize from "../_lib/format";

export default function useGallery({ onFilesIngested } = {}) {
  const [fileMeta, setFileMeta] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const objectUrlsRef = useRef([]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!imageFiles.length || !gallery.length) {
      return;
    }
    const activeFile = imageFiles[activeIndex];
    const activeUrl = gallery[activeIndex];
    if (!activeFile || !activeUrl) {
      return;
    }
    setFileMeta({
      name: activeFile.name,
      size: activeFile.size,
      previewUrl: activeUrl,
    });
  }, [activeIndex, gallery, imageFiles]);

  const ingestFiles = (fileList) => {
    const files = Array.from(fileList ?? []);
    if (!files.length) {
      return;
    }

    const nextImageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );
    if (nextImageFiles.length) {
      const previews = nextImageFiles.map((file) => {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.push(url);
        return { file, url };
      });
      setGallery((current) => [
        ...previews.map((preview) => preview.url),
        ...current,
      ]);
      setImageFiles((current) => [
        ...previews.map((preview) => preview.file),
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
    const nextImageFiles = imageFiles.filter((_, index) => index !== activeIndex);
    setGallery(nextGallery);
    setImageFiles(nextImageFiles);
    const nextIndex = nextGallery.length
      ? Math.min(activeIndex, nextGallery.length - 1)
      : 0;
    setActiveIndex(nextIndex);
    if (!nextGallery.length) {
      setFileMeta(null);
      return;
    }
    const nextFile = nextImageFiles[nextIndex];
    if (nextFile) {
      setFileMeta({
        name: nextFile.name,
        size: nextFile.size,
        previewUrl: nextGallery[nextIndex],
      });
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
  const activeImageFile = imageFiles[activeIndex] ?? null;

  return {
    state: {
      fileMeta,
      isDragging,
      gallery,
      activeIndex,
      imageFiles,
    },
    derived: {
      hasFile,
      dropTitle,
      dropMeta,
      fileSizeLabel,
      activePreview,
      activeImageFile,
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
