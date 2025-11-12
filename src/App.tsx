// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import CacheManager from './components/CacheManager'
import './App.css'
import { PatronForm } from './pages/PatronForm'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PatronForm />} />
      </Routes>
      {/* Cache Manager - only show for developers with explicit admin flag */}
      <CacheManager showButton={window.location.search.includes('admin=true')} />
    </Router>
  )
}

export default App