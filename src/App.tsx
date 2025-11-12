// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import CacheManager from './components/CacheManager'
import { SignatureRequestHandler } from './components/SignatureRequestHandler'
import './App.css'
import { PatronForm } from './pages/PatronForm'
import DeviceManagerPage from './pages/DeviceManagerPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PatronForm />} />
        <Route path="/device-manager" element={<DeviceManagerPage />} />
      </Routes>
      
      {/* Global signature request handler */}
      <SignatureRequestHandler />
      
      {/* Cache Manager - only show for developers with explicit admin flag */}
      <CacheManager showButton={window.location.search.includes('admin=true')} />
    </Router>
  )
}

export default App