import logo from './logo.svg';
import './App.css';
import React, { useEffect, useState } from 'react';

const endpoints = [
  { path: '/api/greeting', label: 'Greeting Endpoint' },
  { path: '/health', label: 'Health Check' },
  { path: '/readiness', label: 'Readiness Check' },
  { path: '/devsecops-info', label: 'DevSecOps Info' },
  { path: '/metrics', label: 'Prometheus Metrics' },
  { path: '/swagger', label: 'API Docs (Swagger)' }
];

function App() {
  return(
  <div className="app">
    <h1>Sample Node.js Demo App</h1>
    <p>This is a simple full-stack demo with backend endpoints and DevSecOps integration.</p>

    <div className="endpoint-grid">
      {endpoints.map((endpoint, index) => (
        <a key={index} href={endpoint.path} target="_blank" rel="noreferrer" className="endpoint-box">
          {endpoint.label}
        </a>
      ))}
    </div>
  </div>
  );
}

export default App;
