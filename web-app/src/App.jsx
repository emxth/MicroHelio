import { Routes, Route } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import FloatingOperatorNav from './components/layout/FloatingOperatorNav';

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

// Grid Operator
import PendingApprovals from './pages/operator/PendingApprovals';
import ReservationSearch from './pages/operator/ReservationSearch';
import ReservationForm from './pages/operator/ReservationForm';
import UpdateReservationForm from './pages/operator/UpdateReservationForm';

export default function App() {
  return (
    <>
      <FloatingOperatorNav />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* TEMP: Public for development */}
        <Route path="/operator/pending-approvals" element={<PendingApprovals />} />
        <Route path="/operator/reservation-search" element={<ReservationSearch />} />
        <Route path="/operator/reservations/new" element={<ReservationForm />} />
        <Route path="/operator/reservations/:id/edit" element={<UpdateReservationForm />} />

        {/* Authenticated — all inside AppLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>

          {/* Both roles */}
          {/* <Route path="/prosumers" element={<ProsumerList />} />
          <Route path="/prosumers/:nic" element={<ProsumerDetail />} />

            {/* Both roles */}
            <Route path="/transactions" element={<TransactionList />} />
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
            <Route path="/pending-bookings" element={<PendingBookings />} />

            <Route path="/transactions" element={<TransactionList />} />
            <Route path="/transactions/:id" element={<TransactionDetail />} /> */}

            {/* Default redirect */}
            {/* <Route path="*" element={<Navigate to="/transactions" replace />} /> */}
          </Route>
        </Route>
      </Routes>
    </>
  );
}
