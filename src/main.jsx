import React from 'react'
import ReactDOM from 'react-dom/client'
import NetworkGraph from './components/NetworkGraph.jsx'

const rootEl = document.getElementById('hero-bg')
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<NetworkGraph />)
}
