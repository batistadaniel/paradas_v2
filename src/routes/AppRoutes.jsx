import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MapPage from '../pages/MapPage'

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
        {/* Caso queira adicionar novas páginas no futuro: <Route path="/linhas" element={<Linhas />} /> */}
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes