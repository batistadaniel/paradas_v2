import React, { useState } from 'react'
import MapComponent from '../components/MapComponent'
import Sidebar from '../components/Sidebar'

function MapPage() {
  const [selectedStopHash, setSelectedStopHash] = useState(null)

  const handleSelectStop = (hash) => {
    setSelectedStopHash(hash)
  }

  const handleCloseSidebar = () => {
    setSelectedStopHash(null)
  }

  return (
    <div id="container">
      <Sidebar 
        stopHash={selectedStopHash} 
        onClose={handleCloseSidebar} 
      />
      <MapComponent 
        onSelectStop={handleSelectStop} 
      />
    </div>
  )
}

export default MapPage