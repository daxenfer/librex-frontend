import { useState, useEffect } from 'react'
import { Modal, Button, Spinner } from 'react-bootstrap'
import type { DeletionImpactDto } from '../servicios/borradoServicio'

interface Props {
  show: boolean
  id: number | null
  title: string
  onImpact: (id: number) => Promise<DeletionImpactDto>
  onDelete: (id: number) => Promise<void>
  onClose: () => void
  onDeleted: () => void
}

const errorMessage = (err: unknown): string => {
  const response = (err as { response?: { data?: { error?: string } } }).response
  return response?.data?.error ?? 'No se pudo completar el borrado.'
}

// El borrado es físico y en cascada, así que antes de confirmar se muestra exactamente
// qué registros se van a perder.
export function ConfirmDeleteModal({ show, id, title, onImpact, onDelete, onClose, onDeleted }: Props) {
  const [impact, setImpact] = useState<DeletionImpactDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!show || id === null) return
    setImpact(null)
    setError(null)
    setLoading(true)
    onImpact(id)
      .then(setImpact)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, id])

  const handleDelete = async () => {
    if (id === null) return
    setDeleting(true)
    setError(null)
    try {
      await onDelete(id)
      onDeleted()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const hasDependents = (impact?.totalDependents ?? 0) > 0

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading && (
          <div className="text-center py-3">
            <Spinner animation="border" size="sm" /> <span className="ms-2">Calculando impacto…</span>
          </div>
        )}

        {impact && (
          <>
            <p className="mb-2">
              Se eliminará <strong>{impact.label}</strong>.
            </p>
            {hasDependents ? (
              <>
                <p className="mb-2 text-danger">
                  Esta acción también borrará permanentemente:
                </p>
                <ul className="mb-2">
                  {impact.items.map(item => (
                    <li key={item.entityName}>
                      {item.count} {item.entityName.toLowerCase()}
                    </li>
                  ))}
                </ul>
                <p className="mb-0 text-muted small">Esta acción no se puede deshacer.</p>
              </>
            ) : (
              <p className="mb-0 text-muted small">
                No tiene registros relacionados. Esta acción no se puede deshacer.
              </p>
            )}
          </>
        )}

        {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={deleting}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={loading || deleting || impact === null}>
          {deleting ? 'Eliminando…' : hasDependents ? 'Eliminar todo' : 'Eliminar'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
