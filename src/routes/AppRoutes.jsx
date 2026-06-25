import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import MapPage from '../pages/MapPage'

function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
      </Routes>
    </HashRouter>
  )
}

export default AppRoutes