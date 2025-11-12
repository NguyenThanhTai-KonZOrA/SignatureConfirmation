// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import CacheManager from './components/CacheManager'
import { SignatureRequestHandler } from './components/SignatureRequestHandler'
import { DeviceManagerProvider } from './contexts/deviceManagerContext'
import { DeviceInfoTest } from './components/DeviceInfoTest'
import './App.css'
import { PatronForm } from './pages/PatronForm'
import DeviceManagerPage from './pages/DeviceManagerPage'
import SignatureConfirmation from './pages/SignatureConfirmation'

function App() {
  return (
    <DeviceManagerProvider>
      <Router>
        <Routes>
          <Route path="/" element={<SignatureConfirmation />} />
          <Route path="/device-manager" element={<DeviceManagerPage />} />
          <Route path="/device-test" element={<DeviceInfoTest />} />
          <Route path="/signature-confirmation" element={<PatronForm />} />
        </Routes>
        
        {/* Global signature request handler */}
        <SignatureRequestHandler />
        
        {/* Cache Manager - only show for developers with explicit admin flag */}
        <CacheManager showButton={window.location.search.includes('admin=true')} />
      </Router>
    </DeviceManagerProvider>
  )
}

export default App