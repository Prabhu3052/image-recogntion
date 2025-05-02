import React, { useState, useCallback } from 'react';
import axios from 'axios';
import './UploadForm.css';

function UploadForm() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please select an image file (JPEG, PNG, GIF, or WebP)');
        return;
      }

      // Validate file size (5MB limit)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size should be less than 5MB');
        return;
      }

      setFile(selectedFile);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Validate file type
      if (!droppedFile.type.startsWith('image/')) {
        setError('Please drop an image file (JPEG, PNG, GIF, or WebP)');
        return;
      }

      // Validate file size
      if (droppedFile.size > 5 * 1024 * 1024) {
        setError('File size should be less than 5MB');
        return;
      }

      setFile(droppedFile);
      setError(null);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(droppedFile);
    }
  }, []);

  const handleSubmit = async (e) => {
    // Only preventDefault if e is an event object
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (!file) {
      setError('Please select a file first!');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await axios.post('/upload', formData, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResult(res.data);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Upload error:', err);
      
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        setError(`Upload failed. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Call handleSubmit without event object for retry
        setTimeout(() => handleSubmit(null), 2000);
      } else {
        setError(err.response?.data?.error || 'Error uploading the image. Please try again later.');
        setLoading(false);
      }
    } finally {
      if (retryCount >= MAX_RETRIES) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="upload-form">
      <div 
        className="drop-zone"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="preview-image" />
        ) : (
          <p>Drag & drop an image here, or click to select</p>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="file-input"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <button 
        onClick={handleSubmit} 
        disabled={!file || loading}
        className={`upload-button ${loading ? 'loading' : ''}`}
      >
        {loading ? (
          <>
            <span className="spinner"></span>
            Processing...
          </>
        ) : 'Upload Image'}
      </button>

      {result && (
        <div className="result-container">
          <h3>Analysis Result</h3>
          <div className="result-details">
            <p><strong>Analysis:</strong> {result.analysis}</p>
            {result.isAnimal && (
              <p><strong>Animal Detected:</strong> {result.species}</p>
            )}
            <p><strong>Timestamp:</strong> {new Date(result.timestamp).toLocaleString()}</p>
          </div>
          <button 
            onClick={() => {
              const dataStr = JSON.stringify(result, null, 2);
              const dataUri = `data:text/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
              const link = document.createElement('a');
              link.href = dataUri;
              link.download = 'analysis_result.json';
              link.click();
            }}
            className="download-button"
          >
            Download Result
          </button>
        </div>
      )}
    </div>
  );
}

export default UploadForm;
