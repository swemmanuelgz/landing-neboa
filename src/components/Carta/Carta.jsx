import { useState } from 'react'
import PdfModal from '../PdfModal/PdfModal'
import './Carta.css'

// Imágenes
import fotoDesayuno from '../../img/foto_desayuno.jpg'
import fotoPlatos from '../../img/foto_platos.png'
import pulpo from '../../img/pulpo.png'
import fotoVinos from '../../img/foto_vinos.jpg'
import fotoCocteles from '../../img/foto_cocteles.png'

// PDFs
import cartaDesayunos from '../../img/carta_desayunos.pdf'
import cartaPrincipal from '../../img/carta_principal.pdf'
import cartaTapeo from '../../img/carta_tapeo.pdf'
import cartaVinos from '../../img/carta_vinos.pdf'
import cartaCocteleria from '../../img/carta_cocteleria.pdf'

const cartasData = [
  { title: 'NUESTROS DESAYUNOS', image: fotoDesayuno, pdf: cartaDesayunos, btnText: 'Carta de desayunos' },
  { title: 'NUESTRA CARTA', image: fotoPlatos, pdf: cartaPrincipal, btnText: 'Carta principal' },
  { title: 'NUESTRAS TAPAS', image: pulpo, pdf: cartaTapeo, btnText: 'Carta de tapeo' },
  { title: 'NUESTROS VINOS', image: fotoVinos, pdf: cartaVinos, btnText: 'Carta de vinos' },
  { title: 'NUESTROS SPRITZS', image: null, pdf: cartaCocteleria, btnText: 'Carta de spritz', className: 'spritz' },
  { title: 'NUESTROS CÓCTELES', image: fotoCocteles, pdf: cartaCocteleria, btnText: 'Carta de coctelería' },
]

const Carta = () => {
  const [pdfModal, setPdfModal] = useState({ isOpen: false, pdfUrl: '', title: '' })

  const openPdfModal = (pdfUrl, title) => {
    setPdfModal({ isOpen: true, pdfUrl, title })
  }

  const closePdfModal = () => {
    setPdfModal({ isOpen: false, pdfUrl: '', title: '' })
  }

  return (
    <>
      <section id="carta" className="carta-section">
        <h2>Nuestras Cartas</h2>
        <div className="carta-grid">
          {cartasData.slice(0, 3).map((carta, idx) => (
            <div key={idx} className="carta-item">
              <div className="carta-header">{carta.title}</div>
              <div 
                className={`carta-image ${carta.className || ''}`} 
                style={carta.image ? { backgroundImage: `url(${carta.image})` } : {}}
              ></div>
              <button onClick={() => openPdfModal(carta.pdf, carta.btnText)} className="carta-btn">
                {carta.btnText}
              </button>
            </div>
          ))}
        </div>
        <div className="carta-grid">
          {cartasData.slice(3).map((carta, idx) => (
            <div key={idx} className="carta-item">
              <div className="carta-header">{carta.title}</div>
              <div 
                className={`carta-image ${carta.className || ''}`} 
                style={carta.image ? { backgroundImage: `url(${carta.image})` } : {}}
              ></div>
              <button onClick={() => openPdfModal(carta.pdf, carta.btnText)} className="carta-btn">
                {carta.btnText}
              </button>
            </div>
          ))}
        </div>
      </section>

      <PdfModal 
        isOpen={pdfModal.isOpen} 
        pdfUrl={pdfModal.pdfUrl} 
        title={pdfModal.title} 
        onClose={closePdfModal} 
      />
    </>
  )
}

export default Carta
