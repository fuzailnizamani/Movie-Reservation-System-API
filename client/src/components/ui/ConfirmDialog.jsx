import Button from './Button';
import Modal from './Modal';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', loading = false, onCancel, onConfirm, danger = true }) {
  return <Modal open={open} onClose={onCancel} title={title}><div className="confirm-copy"><p>{message}</p><div className="modal-actions"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></div></div></Modal>;
}
