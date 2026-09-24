import React from "react";

export function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

/** Returns true if scheduled time is within 12 hours from now. */
export function isWithin12Hours(scheduledDate, scheduledStartTime) {
  if (!scheduledDate) return false;
  const dt = new Date(`${scheduledDate}T${scheduledStartTime || '00:00'}`);
  const diff = dt - new Date();
  return diff > 0 && diff < 12 * 60 * 60 * 1000;
}

export const STATUS_BADGE = {
  Active: { cls: 'bg-success-light text-green-800', label: 'Active' },
  Pending: { cls: 'bg-accent-light text-yellow-800', label: 'Pending' },
  Deactivated: { cls: 'bg-danger-light text-red-800', label: 'Deactivated' },
  Approved: { cls: 'bg-success-light text-green-800', label: 'Approved' },
  Cancelled: { cls: 'bg-danger-light text-red-800', label: 'Cancelled' },
  Completed: { cls: 'bg-blue-100 text-blue-800', label: 'Completed' },
  Initiated: { cls: 'bg-accent-light text-yellow-800', label: 'Initiated' },
  Verified: { cls: 'bg-blue-100 text-blue-800', label: 'Verified' },
  Failed: { cls: 'bg-danger-light text-red-800', label: 'Failed' },
};

export function StatusBadge({ status }) {
  const cfg = STATUS_BADGE[status] || { cls: 'bg-gray-100 text-gray-700', label: status || '-' };
  return React.createElement(
    'span',
    { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`},
      cfg.label
  );
}
