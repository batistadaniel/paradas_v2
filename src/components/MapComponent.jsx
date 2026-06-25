import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, LayersControl, useMap, useMapEvents, Marker } from 'react-leaflet'
import L from 'leaflet'

const CENTRO_BRASILIA = [-15.7938, -47.8827]
const CAMINHO_ICONE_LOCAL = 'https://bus2.info/assets/images/pins/Bus2_pinBus.png'

const stopIconNormal = L.divIcon({
  html: '<div class="stop-button"></div>',
  className: 'custom-stop-icon',
  iconSize: [7, 7],
  iconAnchor: [3.5, 3.5]
})

// COMPONENTE AUXILIAR INTERNO PARA GERENCIAR EVENTOS E FILTRAGEM INSTANTÂNEA
function MapController({ todasParadas, setParadasVisiveis, setZoomAtual }) {
  const map = useMap() // Obtém a instância real do mapa Leaflet instantaneamente

  const filtrarMarcadores = () => {
    if (!map || todasParadas.length === 0) return

    const zoom = map.getZoom()
    setZoomAtual(zoom)

    if (zoom < 13) {
      setParadasVisiveis([])
      return
    }

    const limitesTela = map.getBounds()
    let pulo = 1
    if (zoom === 13) pulo = 6
    if (zoom === 14) pulo = 2

    let contador = 0
    const filtrados = todasParadas.filter(parada => {
      if (parada.latitude && parada.longitude) {
        const localizacao = L.latLng(parada.latitude, parada.longitude)
        if (limitesTela.contains(localizacao)) {
          contador++
          return contador % pulo === 0
        }
      }
      return false
    })

    setParadasVisiveis(filtrados)
  }

  // Escuta os eventos do usuário mexendo no mapa
  useMapEvents({
    moveend: () => filtrarMarcadores(),
    zoomend: () => filtrarMarcadores()
  })

  // Esse useEffect é o segredo! Assim que as paradas chegam da API,
  // ele roda o filtro imediatamente na tela atual, sem precisar mexer no mapa.
  useEffect(() => {
    filtrarMarcadores()
  }, [todasParadas])

  return null
}

function MapComponent({ onSelectStop }) {
  const [todasParadas, setTodasParadas] = useState([])
  const [paradasVisiveis, setParadasVisiveis] = useState([])
  const [zoomAtual, setZoomAtual] = useState(16)

  // Carrega as paradas da API
  useEffect(() => {
    fetch('https://api-df-no-ponto.vercel.app/paradas')
      .then(res => res.json())
      .then(data => {
        setTodasParadas(data.paradas || [])
      })
      .catch(err => console.error("Erro na API de paradas:", err))
  }, [])

  return (
    <MapContainer 
      center={CENTRO_BRASILIA} 
      zoom={16} 
      minZoom={4}
      maxZoom={21}
      zoomControl={false}
      style={{ flex: 1, height: '100%', zIndex: 1 }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Padrão">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={21} maxNativeZoom={19} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Ruas">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maxZoom={21} maxNativeZoom={19} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Híbrido">
          <TileLayer url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" subdomains={['0', '1', '2', '3']} maxZoom={21} maxNativeZoom={19} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satélite">
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={21} maxNativeZoom={18} />
        </LayersControl.BaseLayer>
      </LayersControl>

      {/* Controladora ativa que injeta as funções de tempo real do mapa */}
      <MapController 
        todasParadas={todasParadas} 
        setParadasVisiveis={setParadasVisiveis} 
        setZoomAtual={setZoomAtual} 
      />

      {paradasVisiveis.map((parada) => {
        let iconeDefinido = stopIconNormal
        if (zoomAtual >= 16) {
          let tam = zoomAtual >= 19 ? 22 : 26
          iconeDefinido = L.icon({
            iconUrl: CAMINHO_ICONE_LOCAL,
            iconSize: [tam, tam],
            iconAnchor: [tam / 2, tam / 2]
          })
        }

        return (
          <Marker
            key={parada.id_parada_hash}
            position={[parada.latitude, parada.longitude]}
            icon={iconeDefinido}
            eventHandlers={{
              click: () => onSelectStop(parada.id_parada_hash)
            }}
          />
        )
      })}
    </MapContainer>
  )
}

export default MapComponent