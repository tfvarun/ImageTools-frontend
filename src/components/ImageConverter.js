import React, { useState } from 'react';
import axios from 'axios';
import './ImageConverter.css';
import API_BASE_URL from '../config/api';


const ImageConverter = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [targetFormat, setTargetFormat] = useState('');
  const [availableFormats, setAvailableFormats] = useState([]);
  const [inputFormat, setInputFormat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileSelect = async (selectedFile) => {
    setError('');
    setSuccess('');
    setFile(selectedFile);
    setTargetFormat('');
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);

    // Get available conversion options
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(
  `${API_BASE_URL}/api/get-conversion-options`,
  formData,
  {
    headers: { 'Content-Type': 'multipart/form-data' }
  }
);


      setInputFormat(response.data.inputFormat);
      setAvailableFormats(response.data.availableFormats);
      if (response.data.availableFormats.length > 0) {
        setTargetFormat(response.data.availableFormats[0]);
      }
    } catch (err) {
      setError('Failed to analyze file. Please try again.');
      console.error(err);
    }
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

  const handleConvert = async () => {
    if (!file || !targetFormat) {
      setError('Please select a file and target format');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetFormat', targetFormat);

      const response = await axios.post('/api/convert', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `converted.${targetFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`Image successfully converted to ${targetFormat.toUpperCase()}!`);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Conversion failed. Please try again.');
      setLoading(false);
    }
  };

  

  return (
    <div className="converter-page">
      <div className="container">
        <div className="page-header">
          <h1>Image Converter</h1>
          <p>Convert images between different formats with high quality preservation</p>
        </div>

        {/* Universal Image Converter */}
        <div className="card">
          <h2>Universal Image Converter</h2>
          <p className="section-description">
            Upload any image and see all available conversion options based on your file format.
          </p>

          <div
            className="upload-area"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
              style={{ display: 'none' }}
            />
            {preview ? (
              <div className="preview-container">
                <img src={preview} alt="Preview" className="preview-image" />
                <p className="file-info">
                  {file.name} ({inputFormat.toUpperCase()})
                </p>
              </div>
            ) : (
              <div>
                <div className="upload-icon">📁</div>
                <p className="upload-text">Click to upload or drag and drop</p>
                <p className="upload-hint">PNG, JPEG, WebP, HEIC, JFIF, SVG</p>
                <p className="upload-hint">Max file: 10 MB</p>
              </div>
            )}
          </div>

          {availableFormats.length > 0 && (
            <div className="conversion-options">
              <div className="input-group">
                <label>Convert to:</label>
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                >
                  {availableFormats.map((format) => (
                    <option key={format} value={format}>
                      {format.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleConvert}
                disabled={loading}
              >
                {loading ? 'Converting...' : 'Convert Image'}
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

export default ImageConverter;





