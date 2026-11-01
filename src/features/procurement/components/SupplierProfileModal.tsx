import React from 'react';
import SupplierProfile, { type SupplierProfileProps } from '../SupplierProfile';
import type { Supplier } from '../../../store/procurementStore';

export interface SupplierProfileModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  supplier?: Supplier | null;
  supplierId?: string;
  onEdit?: (supplier: Supplier) => void;
  onDelete?: (id: string, name: string) => void;
  onNewPurchaseForSupplier?: (supplierName: string) => void;
}

export default function SupplierProfileModal({
  isOpen = true,
  onClose = () => {},
  supplier,
  supplierId,
  onEdit,
  onDelete,
  onNewPurchaseForSupplier
}: SupplierProfileModalProps) {
  if (!isOpen) return null;
  const targetId = supplierId || supplier?.id;
  if (!targetId) return null;

  return (
    <SupplierProfile
      supplierId={targetId}
      onBack={onClose}
      onEdit={onEdit}
      onDelete={onDelete}
      onNewPurchaseForSupplier={onNewPurchaseForSupplier}
    />
  );
}
