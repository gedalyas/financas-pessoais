import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({
  open,
  title = 'Confirmação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p style={{ margin: '0 0 16px' }}>{message}</p>
      <div className="modal-actions">
        <button className="button" onClick={onClose}>{cancelLabel}</button>
        <button className={`button ${danger ? 'button-danger' : 'button-success'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
