export const NAV_CONFIG = [
  {
    category: 'Administration',
    items: [
      { label: 'User Management', path: '/users', roles: ['Backoffice'] },
      { label: 'Pending Activations', path: '/pending-activations', roles: ['Backoffice'], badgeKey: 'pendingActivations' },
    ],
  },
  {
    category: 'Prosumer Management',
    items: [
      { label: 'All Prosumers', path: '/prosumers', roles: ['Backoffice', 'GridOperator'] },
    ],
  },
  {
    category: 'Grid Infrastructure',
    items: [
      { label: 'Microgrid Nodes', path: '/nodes', roles: ['Backoffice', 'GridOperator'] },
      // { label: 'Energy Slots', path: '/slots', roles: ['Backoffice', 'GridOperator'] },
    ],
  },
  {
    category: 'Reservations & Bookings',
    items: [
      { label: 'All Reservations', path: '/reservations', roles: ['Backoffice', 'GridOperator'] },
      { label: 'Pending Approvals', path: '/pending-approvals', roles: ['GridOperator'], badgeKey: 'pendingApprovals' },
    ],
  },
  {
    category: 'Transactions',
    items: [
      { label: 'Transaction History', path: '/transactions', roles: ['Backoffice', 'GridOperator'] },
      { label: 'Operator Dashboard', path: '/operator-dashboard', roles: ['Backoffice', 'GridOperator'] },
    ],
  },
];
