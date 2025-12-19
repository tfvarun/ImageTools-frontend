import React, { useState } from 'react';
import axios from 'axios';
import './Resizer.css';
import API_BASE_URL from '../config/api';

const Resizer = () => {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [preview, setPreview] = useState(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [naturalDims, setNaturalDims] = useState({ width: 0, height: 0 });
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState('single'); // 'single' or 'bulk'
  const dimsValid = Number(width) > 0 && Number(height) > 0;

  const handleFileSelect = (selectedFile) => {
    setError('');
    setSuccess('');
    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      const img = new Image();
      img.onload = () => {
        setNaturalDims({ width: img.width, height: img.height });
        if (maintainAspectRatio) {
          const wNum = parseInt(width) || 0;
          const hNum = parseInt(height) || 0;
          if (!wNum && !hNum) {
            setWidth(img.width);
            setHeight(img.height);
          } else if (wNum > 0) {
            setHeight(Math.round(wNum * img.height / img.width));
          } else if (hNum > 0) {
            setWidth(Math.round(hNum * img.width / img.height));
          }
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFilesSelect = (selectedFiles) => {
    setError('');
    setSuccess('');
    let arr = Array.from(selectedFiles);
    if (arr.length > 10) {
      arr = arr.slice(0, 10);
      setError('You can select up to 10 images');
    }
    setFiles(arr);
    const previews = arr.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    setFilePreviews(previews);
  };

  // Cleanup object URLs when files change or component unmounts
  React.useEffect(() => {
    return () => {
      filePreviews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [filePreviews]);

  React.useEffect(() => {
    if (
      maintainAspectRatio && mode === 'single' &&
      naturalDims.width > 0 && naturalDims.height > 0
    ) {
      const wNum = parseInt(width) || 0;
      const hNum = parseInt(height) || 0;
      if (wNum > 0) {
        const newH = Math.round(wNum * naturalDims.height / naturalDims.width);
        if (newH !== hNum) setHeight(newH);
      } else if (hNum > 0) {
        const newW = Math.round(hNum * naturalDims.width / naturalDims.height);
        if (newW !== wNum) setWidth(newW);
      }
    }
  }, [maintainAspectRatio, mode, width, height, naturalDims.width, naturalDims.height]);

  const handleDrop = (e) => {
    e.preventDefault();
    if (mode === 'bulk') {
      handleFilesSelect(e.dataTransfer.files);
    } else {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleResize = async () => {
    if (mode === 'bulk') {
      if (files.length === 0) {
        setError('Please select files');
        return;
      }
    } else {
      if (!file) {
        setError('Please select a file');
        return;
      }
    }

    if (!dimsValid) {
      setError('Please enter width and height');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      const endpoint = mode === 'bulk' ? `${API_BASE_URL}/api/bulk-resize` : `${API_BASE_URL}/api/resize`;

      
      if (mode === 'bulk') {
        files.forEach((f) => {
          formData.append('files', f);
        });
      } else {
        formData.append('file', file);
      }

      formData.append('width', width);
      formData.append('height', height);
      if (mode === 'single') {
        formData.append('maintainAspectRatio', maintainAspectRatio);
      }

      const response = await axios.post(endpoint, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  responseType: mode === 'bulk' ? 'json' : 'blob'
});


      const contentType = response.headers['content-type'] || '';
      if (mode === 'bulk') {
        if (contentType.includes('application/json')) {
          const text = await response.data.text();
          const data = JSON.parse(text);
          const items = Array.isArray(data.files) ? data.files.slice(0, 10) : [];
          for (const item of items) {
            if (item.url) {
              const blobResp = await axios.get(item.url, { responseType: 'blob' });
              const url = window.URL.createObjectURL(blobResp.data);
              const a = document.createElement('a');
              a.href = url;
              a.download = item.name || `resized-${Date.now()}`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } else if (item.data) {
              const blob = await (await fetch(item.data)).blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = item.name || `resized-${Date.now()}`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            }
          }
          setSuccess(`${items.length || files.length} image(s) successfully resized!`);
        } else if (contentType.includes('application/zip')) {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `resized-images-${Date.now()}.zip`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          setSuccess(`${files.length} image(s) successfully resized!`);
        } else {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `resized-images-${Date.now()}.zip`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          setSuccess(`${files.length} image(s) successfully resized!`);
        }
      } else {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const extension = file?.name.split('.').pop() || 'jpg';
        link.setAttribute('download', `resized-${Date.now()}.${extension}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setSuccess('Image successfully resized!');
      }
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Resize failed. Please try again.');
      setLoading(false);
    }
  };

  

  return (
    <div className="resizer-page">
      <div className="container">
        <div className="page-header">
          <h1>Image Resizer</h1>
          <p>Resize single or multiple images with precise dimensions</p>
        </div>

        {/* Mode Selection */}
        <div className="card">
          <div className="mode-selector">
            <button
              className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
              onClick={() => setMode('single')}
            >
              Single Image
            </button>
            <button
              className={`mode-btn ${mode === 'bulk' ? 'active' : ''}`}
              onClick={() => setMode('bulk')}
            >
              Bulk Resize
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="card">
          <h2>{mode === 'bulk' ? 'Bulk Resizer' : 'Image Resizer'}</h2>
          
          <div
            className="upload-area"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => {
              const input = document.getElementById(mode === 'bulk' ? 'files-input' : 'file-input');
              input.click();
            }}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
              style={{ display: 'none' }}
            />
            <input
              id="files-input"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesSelect(e.target.files)}
              style={{ display: 'none' }}
            />
            {mode === 'bulk' ? (
              files.length > 0 ? (
                <div className="files-preview">
                  <p className="file-count">{files.length} file(s) selected (limit 10)</p>
                  <div className="files-grid">
                    {filePreviews.map((p, i) => (
                      <div key={i} className="file-thumb">
                        <img src={p.url} alt={p.name} />
                        <span className="file-thumb-name" title={p.name}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="upload-icon">📁</div>
                  <p className="upload-text">Click to upload or drag and drop</p>
                  <p className="upload-hint">Select up to 10 images</p>
                  <p className="upload-hint">Max file: 10 MB</p>
                </div>
              )
            ) : (
              preview ? (
                <div className="preview-container">
                  <img src={preview} alt="Preview" className="preview-image" />
                  <p className="file-info">{file.name}</p>
                </div>
              ) : (
                <div>
                  <div className="upload-icon">📁</div>
                  <p className="upload-text">Click to upload or drag and drop</p>
                  <p className="upload-hint">PNG, JPEG, WebP, and more</p>
                  <p className="upload-hint">Max file: 10 MB</p>
                </div>
              )
            )}
          </div>

          {/* Resize Options */}
          <div className="resize-options">
            <div className="input-row">
              <div className="input-group">
                <label>Width (px)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWidth(val);
                    if (
                      maintainAspectRatio && mode === 'single' &&
                      naturalDims.width > 0 && naturalDims.height > 0
                    ) {
                      const wNum = parseInt(val) || 0;
                      const hCalc = wNum > 0 ? Math.round(wNum * naturalDims.height / naturalDims.width) : '';
                      setHeight(hCalc);
                    }
                  }}
                  placeholder="Width"
                  min="1"
                />
              </div>
              <div className="input-group">
                <label>Height (px)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHeight(val);
                    if (
                      maintainAspectRatio && mode === 'single' &&
                      naturalDims.width > 0 && naturalDims.height > 0
                    ) {
                      const hNum = parseInt(val) || 0;
                      const wCalc = hNum > 0 ? Math.round(hNum * naturalDims.width / naturalDims.height) : '';
                      setWidth(wCalc);
                    }
                  }}
                  placeholder="Height"
                  min="1"
                />
              </div>
            </div>
            {mode === 'single' && (
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={maintainAspectRatio}
                    onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                  />
                  Maintain aspect ratio
                </label>
              </div>
            )}
  <button
    className="btn btn-primary"
    onClick={handleResize}
    disabled={
      loading || !dimsValid || (mode === 'bulk' ? files.length === 0 : !file)
    }
  >
    {loading ? 'Resizing...' : (mode === 'bulk' ? 'Resize Images' : 'Resize Image')}
  </button>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
        </div>

        
      </div>
    </div>
  );
};

export default Resizer;
