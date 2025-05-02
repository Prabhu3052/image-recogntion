import React from 'react';
import UploadForm from './components/UploadForm';
import ResultsPage from './components/ResultsPage';
import './App.css';

function App() {
  return (
    <div className="App">
      <h1>AI Image Recognition Tool</h1>
      <UploadForm />
      <ResultsPage />
    </div>
  );
}

export default App;
