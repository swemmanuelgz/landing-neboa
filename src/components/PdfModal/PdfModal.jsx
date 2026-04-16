import { useState, useCallback } from 'react'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import './PdfModal.css'

const PdfModal = ({ isOpen, pdfUrl, title, onClose }) => {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [containerWidth, setContainerWidth] = useState(null)

  const containerRef = useCallback((node) => {
    if (node !== null) {
      setContainerWidth(node.getBoundingClientRect().width - 32)
    }
  }, [])

  const handleDocumentLoadSuccess = ({ numPages: total }) => {
    setNumPages(total)
    setPageNumber(1)
  }

  if (!isOpen) return null

  return (
    <div className="pdf-modal" onClick={onClose}>
      <div className="pdf-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-modal-header">
          <h3>{title}</h3>
          <button className="close-pdf-modal" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="pdf-scroll-container" ref={containerRef}>
          <Document
            file={pdfUrl}
            onLoadSuccess={handleDocumentLoadSuccess}
            loading={<div className="pdf-loading">Cargando carta...</div>}
            error={<div className="pdf-error">No se pudo cargar el PDF.</div>}
          >
            <Page
              pageNumber={pageNumber}
              width={containerWidth ?? undefined}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>

        {numPages > 1 ? (
          <div className="pdf-pagination">
            <button
              onClick={() => setPageNumber((p) => p - 1)}
              disabled={pageNumber <= 1}
            >
              ← Anterior
            </button>
            <span>
              {pageNumber} / {numPages}
            </span>
            <button
              onClick={() => setPageNumber((p) => p + 1)}
              disabled={pageNumber >= numPages}
            >
              Siguiente →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default PdfModal
