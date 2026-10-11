import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import AssistantWidget from './components/AssistantWidget.jsx'
import { Toast } from './components/ui.jsx'
import Landing from './pages/Landing.jsx'
import Scan from './pages/Scan.jsx'
import Timeline from './pages/Timeline.jsx'
import RecordView from './pages/RecordView.jsx'
import Chat from './pages/Chat.jsx'
import Hospitals from './pages/Hospitals.jsx'
import Profile from './pages/Profile.jsx'

export default function App() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/record/:id" element={<RecordView />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/hospitals" element={<Hospitals />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <AssistantWidget />
      <Toast />
    </div>
  )
}
