import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_URL from '../config';
import './ResultsPage.css';

function ResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await axios.get(`${API_URL}/results`);
        console.log('Fetched results:', res.data);

        if (res.data.success && Array.isArray(res.data.results)) {
          setResults(res.data.results); // ✅ setting only results
          setError(null);
        } else {
          setError('Invalid server response');
        }
      } catch (err) {
        setError('Failed to fetch results. Please try again later.');
        console.error('Error fetching results:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="results-page">
      <h2>Processed Image Results</h2>
      
      {results.length === 0 ? (
        <div className="no-results">
          <p>No results available. Please upload an image first!</p>
        </div>
      ) : (
        <div className="results-grid">
          {results.map((result, index) => (
            <div key={result._id || index} className="result-card">
              <div className="result-header">
                <h3>{result.originalFilename || `Result ${index + 1}`}</h3>
                <span className="timestamp">
                  {new Date(result.uploadDate || new Date()).toLocaleString()}
                </span>
              </div>
              
              <div className="result-details">
                <div className="detail-item description">
                  <span className="label">Analysis:</span>
                  <p className="value">{result.result?.analysis || 'No analysis available'}</p>
                </div>
                <div className="detail-item">
                  <span className="label">Animal Detected:</span>
                  <span className="value">{result.result?.isAnimal ? 'Yes' : 'No'}</span>
                </div>
                {result.result?.species && (
                  <div className="detail-item">
                    <span className="label">Species:</span>
                    <span className="value">{result.result.species}</span>
                  </div>
                )}
              </div>

              <button 
                onClick={() => {
                  const dataStr = JSON.stringify(result, null, 2);
                  const dataUri = `data:text/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
                  const link = document.createElement('a');
                  link.href = dataUri;
                  link.download = `result-${index + 1}.json`;
                  link.click();
                }}
                className="download-button"
              >
                Download Result
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ResultsPage;
