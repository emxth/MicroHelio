import { Routes, Route } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import FloatingOperatorNav from './components/layout/FloatingOperatorNav';

// Public
import Landing from './pages/Landing';
import Login from './pages/auth/Login';

// Users — Backoffice only
import UserList from './pages/users/UserList';
import UserForm from './pages/users/UserForm';

// Prosumers
import ProsumerList from './pages/prosumers/ProsumerList';
import ProsumerDetail from './pages/prosumers/ProsumerDetail';

// Transactions (Component 4)
import TransactionList from './pages/transactions/TransactionList';
import TransactionDetail from './pages/transactions/TransactionDetail';
import OperatorDashboard from './pages/transactions/OperatorDashboard';

// Grid Operator (Component 3)
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
        <Route element={<ProtectedRoute roles={['Backoffice', 'GridOperator']} />}>
          <Route element={<AppLayout />}>

            {/* Backoffice only */}
            <Route element={<ProtectedRoute roles={['Backoffice']} />}>
              <Route path="/users" element={<UserList />} />
              <Route path="/users/new" element={<UserForm />} />
              <Route path="/users/:id/edit" element={<UserForm />} />
              <Route path="/pending-activations" element={<ProsumerList defaultStatus="Pending" />} />
            </Route>

            {/* GridOperator only */}
            <Route element={<ProtectedRoute roles={['GridOperator']} />}>
              <Route path="/operator/dashboard" element={<OperatorDashboard />} />
            </Route>

            {/* Both roles */}
            <Route path="/prosumers" element={<ProsumerList />} />
            <Route path="/prosumers/:nic" element={<ProsumerDetail />} />
            
            {/* UNCOMMENTED AND FIXED: Active routes for Transactions */}
            <Route path="/transactions" element={<TransactionList />} />
            <Route path="/transactions/:id" element={<TransactionDetail />} />

          </Route>
        </Route>
      </Routes>
    </>
  );
}