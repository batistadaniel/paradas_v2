import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, LayersControl, useMap, useMapEvents, Marker } from 'react-leaflet'
import L from 'leaflet'

const CENTRO_BRASILIA = [-15.7938, -47.8827]
const CAMINHO_ICONE_PARADA = 'src/assets/img/bus-stop-icon-4.png'
const CAMINHO_ICONE_ESTACAO = 'src/assets/img/subway-stop-icon.png'

// Nomes de pontos que devem exibir o ícone de estação de metrô
const NOMES_ESTACAO_METRO = new Set([
  'Central',
  'Galeria',
  '102 Sul',
  '106 Sul',
  '108 Sul',
  '110 Sul',
  '112 Sul',
  '114 Sul',
  'Asa Sul',
  'Shopping',
  'Feira',
  'Guará',
  'Arniqueiras',
  'Águas Claras',
  'Taguatinga Sul',
  'Furnas',
  'Samambaia Sul',
  'Samambaia',
  'Concessionárias',
  'Estrada Parque',
  'Praça do Relógio',
  'Centro Metropolitano',
  'Ceilândia Sul',
  'Guariroba',
  'Ceilândia Centro',
  'Ceilândia Norte',
  'Ceilândia'
])

// COMPONENTE AUXILIAR INTERNO PARA GERENCIAR EVENTOS E FILTRAGEM INSTANTÂNEA
function MapController({ todasParadas, setParadasVisiveis, setZoomAtual }) {
  const map = useMap()

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

  useMapEvents({
    moveend: () => filtrarMarcadores(),
    zoomend: () => filtrarMarcadores()
  })

  useEffect(() => {
    filtrarMarcadores()
  }, [todasParadas])

  return null
}

function MapComponent({ onSelectStop }) {
  const [todasParadas, setTodasParadas] = useState([])
  const [paradasVisiveis, setParadasVisiveis] = useState([])
  const [zoomAtual, setZoomAtual] = useState(16)
  const [paradaSelecionadaId, setParadaSelecionadaId] = useState(null)

  // Carrega as paradas da API
  useEffect(() => {
    fetch('https://api-df-no-ponto.vercel.app/paradas')
      .then(res => res.json())
      .then(data => {
        setTodasParadas(data.paradas || [])
      })
      .catch(err => console.error("Erro na API de paradas:", err))
  }, [])

  const handleSelecionarParada = (parada) => {
    setParadaSelecionadaId(parada.id_parada_hash)
    onSelectStop(parada.id_parada_hash)
  }

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

      <MapController 
        todasParadas={todasParadas} 
        setParadasVisiveis={setParadasVisiveis} 
        setZoomAtual={setZoomAtual} 
      />

      {paradasVisiveis.map((parada) => {
        const estaSelecionada = paradaSelecionadaId === parada.id_parada_hash
        let iconeDefinido

        if (zoomAtual >= 16) {
          // MODO COM ÍCONE DE IMAGEM (Mantém o tamanho original intacto)
          let tam = zoomAtual >= 19 ? 28 : 30
          const ehEstacaoMetro = NOMES_ESTACAO_METRO.has(parada.nome)
          
          iconeDefinido = L.icon({
            iconUrl: ehEstacaoMetro ? CAMINHO_ICONE_ESTACAO : CAMINHO_ICONE_PARADA,
            iconSize: [tam, tam],
            iconAnchor: [tam / 2, tam / 2],
            className: estaSelecionada ? 'icone-parada-selecionada' : ''
          })
        } else {
          // MODO ZOOM AFASTADO (Bolinha controlada)
          const tamBolinha = estaSelecionada ? 14 : 7
          const anchorBolinha = tamBolinha / 2
          const classeBolinha = estaSelecionada ? 'stop-button stop-button-selecionado' : 'stop-button'

          iconeDefinido = L.divIcon({
            html: `<div class="${classeBolinha}" style="width: ${tamBolinha}px; height: ${tamBolinha}px;"></div>`,
            className: 'custom-stop-icon',
            iconSize: [tamBolinha, tamBolinha],
            iconAnchor: [anchorBolinha, anchorBolinha]
          })
        }

        return (
          <Marker
            key={parada.id_parada_hash}
            position={[parada.latitude, parada.longitude]}
            icon={iconeDefinido}
            zIndexOffset={estaSelecionada ? 1000 : 0}
            eventHandlers={{
              click: () => handleSelecionarParada(parada)
            }}
          />
        )
      })}
    </MapContainer>
  )
}

export default MapComponent