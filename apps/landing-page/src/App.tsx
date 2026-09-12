import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { LandingPage } from './pages/LandingPage'
import { JasaWebsitePage } from './pages/JasaWebsitePage'
import { HubungiSalesPage } from './pages/HubungiSalesPage'
import { ScrollToHash } from './components/ScrollToHash'

export default function App() {
  return (
    <>
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pos-kafe" element={<LandingPage />} />
        <Route path="/jasa-website" element={<JasaWebsitePage />} />
        <Route path="/hubungi-sales" element={<HubungiSalesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
