import { Routes, Route} from 'react-router-dom';

import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Public
import Landing from './pages/Landing';
import Login from './pages/auth/Login';

// // Users — Backoffice only
// import UserList from './pages/users/UserList';
// import UserForm from './pages/users/UserForm';

// // Prosumers
// import ProsumerList from './pages/prosumers/ProsumerList';
// import ProsumerDetail from './pages/prosumers/ProsumerDetail';
// import PendingActivations from './pages/prosumers/PendingActivations';

// // Nodes
// import NodeList from './pages/nodes/NodeList';
// import NodeForm from './pages/nodes/NodeForm';
// import NodeDetail from './pages/nodes/NodeDetail';

// // Slots
// import SlotList from './pages/slots/SlotList';
// import SlotForm from './pages/slots/SlotForm';

// // Reservations
// import ReservationList from './pages/reservations/ReservationList';
// import ReservationDetail from './pages/reservations/ReservationDetail';
// import PendingBookings from './pages/reservations/PendingBookings';

// Transactions
import TransactionList from './pages/transactions/TransactionList';
import TransactionDetail from './pages/transactions/TransactionDetail';
import OperatorDashboard from './pages/transactions/OperatorDashboard';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Authenticated — all inside AppLayout */}
      <Route element={<ProtectedRoute roles={['Backoffice', 'GridOperator']} />}>
        <Route element={<AppLayout />}>

          {/* Backoffice only */}
          {/* <Route element={<ProtectedRoute roles={['Backoffice']} />}>
            <Route path="/users" element={<UserList />} />
            <Route path="/users/new" element={<UserForm />} />
            <Route path="/users/:id/edit" element={<UserForm />} />
            <Route path="/pending-activations" element={<PendingActivations />} />
          </Route> */}

          {/* Both roles */}
          {/* <Route path="/prosumers" element={<ProsumerList />} />
          <Route path="/prosumers/:nic" element={<ProsumerDetail />} />

          <Route path="/nodes" element={<NodeList />} />
          <Route path="/nodes/new" element={<NodeForm />} />
          <Route path="/nodes/:id" element={<NodeDetail />} />
          <Route path="/nodes/:id/edit" element={<NodeForm />} />

          <Route path="/slots" element={<SlotList />} />
          <Route path="/slots/new" element={<SlotForm />} />
          <Route path="/slots/:id/edit" element={<SlotForm />} />

          <Route path="/reservations" element={<ReservationList />} />
          <Route path="/reservations/:id" element={<ReservationDetail />} />
          <Route path="/pending-bookings" element={<PendingBookings />} /> */}

          <Route path="/transactions" element={<TransactionList />} />
          <Route path="/transactions/:id" element={<TransactionDetail />} />
          <Route path="/operator-dashboard" element={<OperatorDashboard />} />
          {/* Default redirect */}
          {/* <Route path="*" element={<Navigate to="/transactions" replace />} /> */}
        </Route>
      </Route>
    </Routes>
  );
}
