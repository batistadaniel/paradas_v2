import React, { useEffect, useState } from 'react'

const BASE_API = 'https://api-df-no-ponto.vercel.app/paradas'

function Sidebar({ stopHash, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [paradaInfo, setParadaInfo] = useState({ nome: 'Carregando...', codigo: '' })
  const [previsoes, setPrevisoes] = useState([])
  const [linhasAgrupadas, setLinhasAgrupadas] = useState([])
  const [isRefresh, setIsRefresh] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [horaBrasilia, setHoraBrasilia] = useState('')
  // true somente se a janela estiver maximizada (≥ screen.availWidth - 10)
  const [podeExpandir, setPodeExpandir] = useState(false)

  // Relógio Brasília
  useEffect(() => {
    const tick = () => setHoraBrasilia(new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  // Detecta se a janela está maximizada
  useEffect(() => {
    const verificar = () => {
      const maximizado = window.innerWidth >= (window.screen.availWidth - 10)
      setPodeExpandir(maximizado)
      // se a janela encolher enquanto expandido, recolhe
      if (!maximizado) setIsExpanded(false)
    }
    verificar()
    window.addEventListener('resize', verificar)
    return () => window.removeEventListener('resize', verificar)
  }, [])

  // Bloqueia zoom quando expandido
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]')
    const originalContent = viewport ? viewport.getAttribute('content') : null
    const blockZoom = (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault() }
    const blockGesture = (e) => e.preventDefault()

    if (isExpanded) {
      viewport?.setAttribute('content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no')
      window.addEventListener('wheel', blockZoom, { passive: false })
      window.addEventListener('gesturestart', blockGesture, { passive: false })
      window.addEventListener('gesturechange', blockGesture, { passive: false })
    } else {
      if (viewport && originalContent) viewport.setAttribute('content', originalContent)
      window.removeEventListener('wheel', blockZoom)
      window.removeEventListener('gesturestart', blockGesture)
      window.removeEventListener('gesturechange', blockGesture)
    }
    return () => {
      if (viewport && originalContent) viewport.setAttribute('content', originalContent)
      window.removeEventListener('wheel', blockZoom)
      window.removeEventListener('gesturestart', blockGesture)
      window.removeEventListener('gesturechange', blockGesture)
    }
  }, [isExpanded])

  const fetchPrevisoes = async (ehRefresh = false) => {
    if (!stopHash) return
    if (!ehRefresh) setLoading(true)
    setIsRefresh(ehRefresh)

    try {
      const controller = new AbortController()
      const tid1 = setTimeout(() => controller.abort(), 8000)

      const resParada = await fetch(`${BASE_API}/${stopHash}`, { signal: controller.signal })
      if (!resParada.ok) throw new Error()
      const dadosHash = await resParada.json()
      clearTimeout(tid1)

      const { nome, codigo } = dadosHash.parada
      // Se nome for "null" (string) ou ausente, exibe só o código; senão exibe "Código | Nome"
      const nomeExibido = (!nome || nome === 'null')
        ? (codigo || 'Parada')
        : (codigo ? `${codigo} | ${nome}` : nome)

      setParadaInfo({ nome: nomeExibido, codigo: '' })

      const resProximos = await fetch(`${BASE_API}/${dadosHash.parada.id_parada_hash}/proximos`, { signal: controller.signal })
      if (!resProximos.ok) throw new Error()
      const dadosProximos = await resProximos.json()

      processarDados(dadosProximos.linhas)
      setError(false)
    } catch {
      if (!ehRefresh) setError(true)
    } finally {
      setLoading(false)
    }
  }

  const processarDados = (linhasAlvo) => {
    if (!linhasAlvo || !Array.isArray(linhasAlvo)) {
      setPrevisoes([]); setLinhasAgrupadas([]); return
    }

    // ── MODO RETRAÍDO: uma linha por previsão ──
    let flat = []
    linhasAlvo.forEach(linha => {
      if (!linha.proximos || linha.proximos.length === 0) return
      let codigo = linha.codigo_linha
      if (!codigo && linha.nome_linha) {
        if (linha.nome_linha.includes("Ceilândia") || linha.nome_linha.includes("Samambaia"))
          codigo = "METRÔ"
      }
      const cor = linha.cor_operadora || '#71717a'
      linha.proximos.forEach(p => {
        flat.push({ codigo: codigo || "", destino: linha.destino, corBg: cor,
          horarioMeta: p.horario, amanha: p.proximo_dia === true, veiculo: p.veiculo || null })
      })
    })
    flat.sort((a, b) => {
      if (a.amanha !== b.amanha) return a.amanha ? 1 : -1
      return a.horarioMeta.localeCompare(b.horarioMeta)
    })
    setPrevisoes(flat)

    // ── MODO EXPANDIDO: agrupado por linha, até 3 horários ──
    let mapa = {}
    linhasAlvo.forEach(linha => {
      if (!linha.proximos || linha.proximos.length === 0) return
      let codigo = linha.codigo_linha
      if (!codigo && linha.nome_linha) {
        if (linha.nome_linha.includes("Ceilândia") || linha.nome_linha.includes("Samambaia"))
          codigo = "METRÔ"
      }
      const cor = linha.cor_operadora || '#71717a'
      const chave = `${codigo}_${linha.destino}`
      if (!mapa[chave]) {
        mapa[chave] = { codigo: codigo || "", destino: linha.destino,
          nomeDestino: linha.nome_linha || '', corBg: cor, horarios: [] }
      }
      linha.proximos.forEach(p => {
        mapa[chave].horarios.push({ horarioMeta: p.horario, amanha: p.proximo_dia === true, veiculo: p.veiculo || null })
      })
    })
    Object.values(mapa).forEach(g => {
      g.horarios.sort((a, b) => {
        if (a.amanha !== b.amanha) return a.amanha ? 1 : -1
        return a.horarioMeta.localeCompare(b.horarioMeta)
      })
    })
    const agrupados = Object.values(mapa).sort((a, b) => {
      const ha = a.horarios[0] || { horarioMeta: '99:99', amanha: true }
      const hb = b.horarios[0] || { horarioMeta: '99:99', amanha: true }
      if (ha.amanha !== hb.amanha) return ha.amanha ? 1 : -1
      return ha.horarioMeta.localeCompare(hb.horarioMeta)
    })
    setLinhasAgrupadas(agrupados)
  }

  function calcularTempoRestante(horarioMeta, ehAmanha, temPrefixo = false) {
    if (!horarioMeta) return ''
    if (ehAmanha) return horarioMeta.substring(0, 5)
    const agora = new Date()
    const [h, m, s] = horarioMeta.split(':').map(Number)
    const meta = new Date(); meta.setHours(h, m, s, 0)
    const min = Math.floor((meta - agora) / 60000)
    if (min < 1) return <span className={`tempo-agora${temPrefixo ? ' com-prefixo' : ''}`}>Agora</span>
    if (min < 60) return `${min} min`
    return horarioMeta.substring(0, 5)
  }

  useEffect(() => {
    fetchPrevisoes(false)
    const iv = setInterval(() => fetchPrevisoes(true), 30000)
    return () => clearInterval(iv)
  }, [stopHash])

  useEffect(() => { setIsExpanded(false) }, [stopHash])

  if (!stopHash) return null

  const corTexto = (corBg) =>
    corBg && (corBg.toLowerCase() === '#bbff00' || corBg.toLowerCase() === '#ffd200')
      ? '#000000' : '#ffffff'

  // ── TABELA MODO RETRAÍDO ──
  const tabelaRetraida = (
    <table className="bus-table">
      <thead>
        <tr>
          <th className="col-horario">Horário</th>
          <th className="col-linha">Linha</th>
          <th className="col-destino">Destino</th>
        </tr>
      </thead>
      <tbody className={isRefresh ? "flash-refresh" : ""}>
        {previsoes.map((item, idx) => (
          item && (
            <tr key={idx}
              className={item.veiculo ? "linha-com-gps" : ""}
              style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f1f5f9' }}
            >
              <td className="col-horario">
                <div className="container-tempo">
                  <span className="tempo-chegada">{calcularTempoRestante(item.horarioMeta, item.amanha)}</span>
                  {item.amanha && <span className="label-amanha">Amanhã</span>}
                  {item.veiculo && <span className="label-prefixo">{item.veiculo}</span>}
                </div>
              </td>
              <td className="col-linha">
                <span className="badge-linha" style={{ backgroundColor: item.corBg, color: corTexto(item.corBg) }}>
                  {item.codigo}
                </span>
              </td>
              <td className="col-destino">{item.destino}</td>
            </tr>
          )
        ))}
      </tbody>
    </table>
  )

  // ── TABELA MODO EXPANDIDO ──
  const tabelaExpandida = (
    <table className="bus-table bus-table-expandida">
      <thead>
        <tr>
          <th className="col-linha-exp">Linha</th>
          <th className="col-destino-exp">Destino</th>
          <th className="col-horario-exp">Próximos horários</th>
        </tr>
      </thead>
      <tbody className={isRefresh ? "flash-refresh" : ""}>
        {linhasAgrupadas.map((item, idx) => {
          if (!item) return null
          const temGps = item.horarios.some(h => h.veiculo)
          const slots = item.horarios.slice(0, 3)
          return (
            <tr key={idx}
              className={temGps ? "linha-com-gps" : ""}
              style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f1f5f9' }}
            >
              <td className="col-linha-exp">
                <span className="badge-linha" style={{ backgroundColor: item.corBg, color: corTexto(item.corBg) }}>
                  {item.codigo}
                </span>
              </td>
              <td className="col-destino-exp">
                <div className="destino-principal">{item.destino}</div>
                {item.nomeDestino && <div className="destino-sub">{item.nomeDestino}</div>}
              </td>
              <td className="col-horario-exp">
                <div className="horarios-expandidos">
                  {slots.map((h, hIdx) => (
                    <div className="container-tempo-exp" key={hIdx}>
                      <span className={`tempo-chegada${h.veiculo ? ' com-prefixo' : ''}`}>{calcularTempoRestante(h.horarioMeta, h.amanha, !!h.veiculo)}</span>
                      {h.amanha && <span className="label-amanha">Amanhã</span>}
                      {h.veiculo && <span className="label-prefixo">{h.veiculo}</span>}
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  const semDados = !previsoes || previsoes.length === 0

  return (
    <aside id="sidebar" className={isExpanded ? 'expanded' : ''}>
      <div className="actions-container">
        {/* Botão expandir só aparece se a janela estiver maximizada */}
        {podeExpandir && (
          <button className="btn-topo btn-expandir" onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Recolher" : "Expandir"}>
            {isExpanded ? "⛶" : "🗖"}
          </button>
        )}
        <button className="btn-topo" onClick={onClose} title="Fechar">&times;</button>
      </div>

      <div className="sidebar-header">
        <div className="header-left">
          <h2>{loading && !isRefresh ? "Carregando..." : paradaInfo.nome}</h2>
          <p>{loading && !isRefresh ? "Buscando previsões..." : paradaInfo.codigo}</p>
        </div>
        {isExpanded && <div className="relogio-container">{horaBrasilia}</div>}
      </div>

      <div className="sidebar-content">
        {error ? (
          <div className="msg-estado">Não foi possível obter dados desta parada.</div>
        ) : loading && !isRefresh ? (
          <div className="msg-estado">Buscando linhas...</div>
        ) : semDados ? (
          <div className="msg-estado">Nenhum ônibus programado ou monitorado no momento.</div>
        ) : isExpanded ? tabelaExpandida : tabelaRetraida}
      </div>
    </aside>
  )
}

export default Sidebar