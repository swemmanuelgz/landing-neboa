import './PdfModal.css'

const PdfModal = ({ isOpen, pdfUrl, title, onClose }) => {
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
        <iframe
          src={pdfUrl}
          title={title}
          className="pdf-viewer"
        />
      </div>
    </div>
  )
}

export default PdfModal
