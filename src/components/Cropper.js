import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Cropper.css';

const Cropper = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropMode, setCropMode] = useState('manual'); // 'manual' or 'preset'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(100); // percentage zoom for display
  const [isMoving, setIsMoving] = useState(false);
  const [moveStart, setMoveStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState(null);
  const [isPinching, setIsPinching] = useState(false);
  const [pinchStartDist, setPinchStartDist] = useState(0);
  const [pinchStartZoom, setPinchStartZoom] = useState(100);

  useEffect(() => {
    if (preview && imageRef.current) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
        setCropArea({ x: 0, y: 0, width: img.width, height: img.height });
        // Fit-to-view default zoom (limit to ~800px width)
        const target = 800;
        const pct = Math.min(100, Math.round((target / img.width) * 100));
        setZoom(pct < 30 ? 30 : pct);
      };
      img.src = preview;
    }
  }, [preview]);

  const handleFileSelect = (selectedFile) => {
    setError('');
    setSuccess('');
    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const getImageScale = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return 1;
    const naturalWidth = imageDimensions.width || 1;
    const displayWidth = Math.round((zoom / 100) * naturalWidth);
    return displayWidth / naturalWidth;
  }, [imageDimensions, zoom]);

  const handleMouseDown = (e) => {
    if (!preview) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = getImageScale();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const handle = e.target.dataset && e.target.dataset.handle;
    if (handle) {
      setIsResizing(true);
      setActiveHandle(handle);
      setDragStart({ x, y });
      return;
    }

    const insideExisting =
      x >= cropArea.x &&
      y >= cropArea.y &&
      x <= cropArea.x + cropArea.width &&
      y <= cropArea.y + cropArea.height;

    if (insideExisting && cropArea.width > 0 && cropArea.height > 0) {
      setIsMoving(true);
      setMoveStart({ x, y });
    } else {
      setIsDragging(true);
      setDragStart({ x, y });
      setCropArea({ x, y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = useCallback((e) => {
    if ((!isDragging && !isMoving && !isResizing) || !preview || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = getImageScale();
    const currentX = Math.max(0, Math.min((e.clientX - rect.left) / scale, imageDimensions.width));
    const currentY = Math.max(0, Math.min((e.clientY - rect.top) / scale, imageDimensions.height));

    if (isResizing && activeHandle) {
      let x = cropArea.x;
      let y = cropArea.y;
      let w = cropArea.width;
      let h = cropArea.height;

      if (activeHandle === 'nw') {
        w = w + (x - currentX);
        h = h + (y - currentY);
        x = currentX;
        y = currentY;
      } else if (activeHandle === 'ne') {
        w = Math.abs(currentX - x);
        h = h + (y - currentY);
        y = currentY;
      } else if (activeHandle === 'sw') {
        w = w + (x - currentX);
        x = currentX;
        h = Math.abs(currentY - y);
      } else if (activeHandle === 'se') {
        w = Math.abs(currentX - x);
        h = Math.abs(currentY - y);
      } else if (activeHandle === 'n') {
        h = h + (y - currentY);
        y = currentY;
      } else if (activeHandle === 's') {
        h = Math.abs(currentY - y);
      } else if (activeHandle === 'w') {
        w = w + (x - currentX);
        x = currentX;
      } else if (activeHandle === 'e') {
        w = Math.abs(currentX - x);
      }

      w = Math.max(1, Math.min(w, imageDimensions.width - x));
      h = Math.max(1, Math.min(h, imageDimensions.height - y));
      setCropArea({ x, y, width: w, height: h });
    } else if (isMoving) {
      const dx = currentX - moveStart.x;
      const dy = currentY - moveStart.y;
      let nx = cropArea.x + dx;
      let ny = cropArea.y + dy;
      nx = Math.max(0, Math.min(nx, imageDimensions.width - cropArea.width));
      ny = Math.max(0, Math.min(ny, imageDimensions.height - cropArea.height));
      setMoveStart({ x: currentX, y: currentY });
      setCropArea({ x: nx, y: ny, width: cropArea.width, height: cropArea.height });
    } else {
      const width = currentX - dragStart.x;
      const height = currentY - dragStart.y;
      const newX = width < 0 ? currentX : dragStart.x;
      const newY = height < 0 ? currentY : dragStart.y;
      const newWidth = Math.abs(width);
      const newHeight = Math.abs(height);
      const finalX = Math.max(0, Math.min(newX, imageDimensions.width - newWidth));
      const finalY = Math.max(0, Math.min(newY, imageDimensions.height - newHeight));
      const finalWidth = Math.min(newWidth, imageDimensions.width - finalX);
      const finalHeight = Math.min(newHeight, imageDimensions.height - finalY);
      setCropArea({ x: finalX, y: finalY, width: finalWidth, height: finalHeight });
    }
  }, [
    isDragging,
    isMoving,
    isResizing,
    preview,
    imageDimensions,
    activeHandle,
    moveStart,
    cropArea,
    dragStart,
    getImageScale
  ]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsMoving(false);
    setIsResizing(false);
    setActiveHandle(null);
  }, []);

  const handleTouchStart = (e) => {
    if (!preview) return;
    if (e.touches && e.touches.length === 2) {
      const a = e.touches[0];
      const b = e.touches[1];
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      setIsPinching(true);
      setPinchStartDist(dist);
      setPinchStartZoom(zoom);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const scale = getImageScale();
    const t = e.touches[0] || e.changedTouches[0];
    const x = (t.clientX - rect.left) / scale;
    const y = (t.clientY - rect.top) / scale;
    const handle = e.target.dataset && e.target.dataset.handle;
    if (handle) {
      setIsResizing(true);
      setActiveHandle(handle);
      setDragStart({ x, y });
      return;
    }
    const insideExisting =
      x >= cropArea.x &&
      y >= cropArea.y &&
      x <= cropArea.x + cropArea.width &&
      y <= cropArea.y + cropArea.height;
    if (insideExisting && cropArea.width > 0 && cropArea.height > 0) {
      setIsMoving(true);
      setMoveStart({ x, y });
    } else {
      setIsDragging(true);
      setDragStart({ x, y });
      setCropArea({ x, y, width: 0, height: 0 });
    }
  };

  const handleTouchMove = useCallback((e) => {
    if ((!isDragging && !isMoving && !isResizing) || !preview || !containerRef.current) return;
    if (isPinching && e.touches && e.touches.length === 2) {
      e.preventDefault();
      const a = e.touches[0];
      const b = e.touches[1];
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ratio = dist / (pinchStartDist || 1);
      const next = Math.round(Math.min(150, Math.max(30, pinchStartZoom * ratio)));
      if (next !== zoom) setZoom(next);
      return;
    }
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const scale = getImageScale();
    const t = e.touches[0] || e.changedTouches[0];
    const currentX = Math.max(0, Math.min((t.clientX - rect.left) / scale, imageDimensions.width));
    const currentY = Math.max(0, Math.min((t.clientY - rect.top) / scale, imageDimensions.height));

    if (isResizing && activeHandle) {
      let x = cropArea.x;
      let y = cropArea.y;
      let w = cropArea.width;
      let h = cropArea.height;

      if (activeHandle === 'nw') {
        w = w + (x - currentX);
        h = h + (y - currentY);
        x = currentX;
        y = currentY;
      } else if (activeHandle === 'ne') {
        w = Math.abs(currentX - x);
        h = h + (y - currentY);
        y = currentY;
      } else if (activeHandle === 'sw') {
        w = w + (x - currentX);
        x = currentX;
        h = Math.abs(currentY - y);
      } else if (activeHandle === 'se') {
        w = Math.abs(currentX - x);
        h = Math.abs(currentY - y);
      } else if (activeHandle === 'n') {
        h = h + (y - currentY);
        y = currentY;
      } else if (activeHandle === 's') {
        h = Math.abs(currentY - y);
      } else if (activeHandle === 'w') {
        w = w + (x - currentX);
        x = currentX;
      } else if (activeHandle === 'e') {
        w = Math.abs(currentX - x);
      }

      w = Math.max(1, Math.min(w, imageDimensions.width - x));
      h = Math.max(1, Math.min(h, imageDimensions.height - y));
      setCropArea({ x, y, width: w, height: h });
    } else if (isMoving) {
      const dx = currentX - moveStart.x;
      const dy = currentY - moveStart.y;
      let nx = cropArea.x + dx;
      let ny = cropArea.y + dy;
      nx = Math.max(0, Math.min(nx, imageDimensions.width - cropArea.width));
      ny = Math.max(0, Math.min(ny, imageDimensions.height - cropArea.height));
      setMoveStart({ x: currentX, y: currentY });
      setCropArea({ x: nx, y: ny, width: cropArea.width, height: cropArea.height });
    } else {
      const width = currentX - dragStart.x;
      const height = currentY - dragStart.y;
      const newX = width < 0 ? currentX : dragStart.x;
      const newY = height < 0 ? currentY : dragStart.y;
      const newWidth = Math.abs(width);
      const newHeight = Math.abs(height);
      const finalX = Math.max(0, Math.min(newX, imageDimensions.width - newWidth));
      const finalY = Math.max(0, Math.min(newY, imageDimensions.height - newHeight));
      const finalWidth = Math.min(newWidth, imageDimensions.width - finalX);
      const finalHeight = Math.min(newHeight, imageDimensions.height - finalY);
      setCropArea({ x: finalX, y: finalY, width: finalWidth, height: finalHeight });
    }
  }, [
    isDragging,
    isMoving,
    isResizing,
    preview,
    imageDimensions,
    activeHandle,
    moveStart,
    cropArea,
    dragStart,
    isPinching,
    pinchStartDist,
    pinchStartZoom,
    zoom,
    getImageScale
  ]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setIsMoving(false);
    setIsResizing(false);
    setActiveHandle(null);
    setIsPinching(false);
  }, []);

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      setZoom((z) => Math.max(30, z - 5));
    } else {
      setZoom((z) => Math.min(150, z + 5));
    }
  };

  useEffect(() => {
    const handleMouseMoveWrapper = (e) => handleMouseMove(e);
    const handleMouseUpWrapper = () => handleMouseUp();
    const handleTouchMoveWrapper = (e) => handleTouchMove(e);
    const handleTouchEndWrapper = () => handleTouchEnd();
    if (isDragging || isMoving || isResizing) {
      window.addEventListener('mousemove', handleMouseMoveWrapper);
      window.addEventListener('mouseup', handleMouseUpWrapper);
      window.addEventListener('touchmove', handleTouchMoveWrapper, { passive: false });
      window.addEventListener('touchend', handleTouchEndWrapper);
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveWrapper);
        window.removeEventListener('mouseup', handleMouseUpWrapper);
        window.removeEventListener('touchmove', handleTouchMoveWrapper);
        window.removeEventListener('touchend', handleTouchEndWrapper);
      };
    }
  }, [
    isDragging,
    isMoving,
    isResizing,
    dragStart,
    preview,
    cropArea,
    activeHandle,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd
  ]);

  const handleCrop = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (cropArea.width === 0 || cropArea.height === 0) {
      setError('Please select a crop area');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('x', Math.round(cropArea.x));
      formData.append('y', Math.round(cropArea.y));
      formData.append('width', Math.round(cropArea.width));
      formData.append('height', Math.round(cropArea.height));

      const response = await axios.post('/api/crop', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'cropped-image.jpg');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess('Image successfully cropped!');
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Crop failed. Please try again.');
      setLoading(false);
    }
  };

  const applyPreset = (preset) => {
    if (!imageDimensions.width || !imageDimensions.height) return;
    
    const { width, height } = imageDimensions;
    let newCrop = {};
    const fit = (rw, rh) => {
      const s = Math.min(width / rw, height / rh);
      const cw = Math.round(rw * s);
      const ch = Math.round(rh * s);
      const cx = Math.round((width - cw) / 2);
      const cy = Math.round((height - ch) / 2);
      return { x: cx, y: cy, width: cw, height: ch };
    };

    switch (preset) {
      case 'square':
        const size = Math.min(width, height);
        newCrop = {
          x: (width - size) / 2,
          y: (height - size) / 2,
          width: size,
          height: size
        };
        break;
      case 'center':
        newCrop = {
          x: width * 0.1,
          y: height * 0.1,
          width: width * 0.8,
          height: height * 0.8
        };
        break;
      case 'portrait':
        newCrop = fit(9, 16);
        break;
      case 'landscape':
        newCrop = fit(16, 9);
        break;
      default:
        return;
    }

    setCropArea(newCrop);
  };

  

  const scale = getImageScale();
  const containerDisplayWidth = imageDimensions.width * scale;
  const containerDisplayHeight = imageDimensions.height * scale;
  const displayCrop = {
    x: cropArea.x * scale,
    y: cropArea.y * scale,
    width: cropArea.width * scale,
    height: cropArea.height * scale
  };
  const hasSelection = cropArea.width > 0 && cropArea.height > 0;

  return (
    <div className="cropper-page">
      <div className="container">
        <div className="page-header">
          <h1>Image Cropper</h1>
          <p>Crop images with pixel-perfect precision</p>
        </div>

        {/* Upload Area */}
            <div className="card">
          <h2>Universal Image Cropper</h2>

          <div
            className="upload-area"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => !preview && document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
              style={{ display: 'none' }}
            />
            {preview ? (
              <>
                <div className="crop-scroll">
                  <div
                  className="crop-container"
                  ref={containerRef}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  onWheel={handleWheel}
                  style={{ width: imageDimensions.width ? `${Math.round((zoom/100)*imageDimensions.width)}px` : '100%' }}
                >
                    <img
                      ref={imageRef}
                      src={preview}
                      alt="Preview"
                      className="crop-preview-image"
                      draggable={false}
                    />
                    {hasSelection && (
                      <>
                        <div className="crop-mask mask-top" style={{ left: 0, top: 0, width: `${containerDisplayWidth}px`, height: `${Math.max(0, displayCrop.y)}px` }}></div>
                        <div className="crop-mask mask-left" style={{ left: 0, top: `${displayCrop.y}px`, width: `${Math.max(0, displayCrop.x)}px`, height: `${displayCrop.height}px` }}></div>
                        <div className="crop-mask mask-right" style={{ left: `${displayCrop.x + displayCrop.width}px`, top: `${displayCrop.y}px`, width: `${Math.max(0, containerDisplayWidth - (displayCrop.x + displayCrop.width))}px`, height: `${displayCrop.height}px` }}></div>
                        <div className="crop-mask mask-bottom" style={{ left: 0, top: `${displayCrop.y + displayCrop.height}px`, width: `${containerDisplayWidth}px`, height: `${Math.max(0, containerDisplayHeight - (displayCrop.y + displayCrop.height))}px` }}></div>

                        <div
                          className="crop-overlay"
                          onMouseDown={handleMouseDown}
                          onTouchStart={handleTouchStart}
                          style={{
                            left: `${displayCrop.x}px`,
                            top: `${displayCrop.y}px`,
                            width: `${displayCrop.width}px`,
                            height: `${displayCrop.height}px`
                          }}
                        >
                          <div className="crop-handle crop-handle-nw" data-handle="nw" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}></div>
                          <div className="crop-handle crop-handle-ne" data-handle="ne" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}></div>
                          <div className="crop-handle crop-handle-sw" data-handle="sw" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}></div>
                          <div className="crop-handle crop-handle-se" data-handle="se" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}></div>
                          <div className="crop-handle crop-handle-n" data-handle="n" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}></div>
                          <div className="crop-handle crop-handle-s" data-handle="s" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}></div>
                          <div className="crop-handle crop-handle-w" data-handle="w" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}></div>
                          <div className="crop-handle crop-handle-e" data-handle="e" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}></div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="zoom-toolbar">
                  <div className="zoom-pill">
                    <span className="zoom-dim">{Math.round(cropArea.width)}px × {Math.round(cropArea.height)}px</span>
                    <button className="zoom-btn" onClick={() => setZoom((z) => Math.max(30, z - 5))}>-</button>
                    <span className="zoom-percent">{zoom}%</span>
                    <button className="zoom-btn" onClick={() => setZoom((z) => Math.min(150, z + 5))}>+</button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="upload-icon">📁</div>
                <p className="upload-text">Click to upload or drag and drop</p>
                <p className="upload-hint">PNG, JPEG, WebP, and more</p>
                <p className="upload-hint">Max file: 10 MB</p>
              </div>
            )}
          </div>

          {preview && (
            <div className="crop-controls">
              <div className="crop-mode-selector">
                <button
                  className={`mode-btn ${cropMode === 'manual' ? 'active' : ''}`}
                  onClick={() => setCropMode('manual')}
                >
                  Manual Crop
                </button>
                <button
                  className={`mode-btn ${cropMode === 'preset' ? 'active' : ''}`}
                  onClick={() => setCropMode('preset')}
                >
                  Preset Crop
                </button>
              </div>

              {cropMode === 'preset' && (
                <div className="preset-buttons">
                  <button className="btn btn-secondary" onClick={() => applyPreset('square')}>
                    Square
                  </button>
                  <button className="btn btn-secondary" onClick={() => applyPreset('center')}>
                    Center
                  </button>
                  <button className="btn btn-secondary" onClick={() => applyPreset('portrait')}>
                    Portrait
                  </button>
                  <button className="btn btn-secondary" onClick={() => applyPreset('landscape')}>
                    Landscape
                  </button>
                </div>
              )}

              


              <button
                className="btn btn-primary"
                onClick={handleCrop}
                disabled={loading || cropArea.width === 0 || cropArea.height === 0}
              >
                {loading ? 'Cropping...' : 'Crop Image'}
              </button>
            </div>
          )}

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
        </div>

        
      </div>
    </div>
  );
};

export default Cropper;
