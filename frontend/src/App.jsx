import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth } from './auth/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Chat from './pages/Chat.jsx'
import MesCommandes from './pages/MesCommandes.jsx'
import MesRappels from './pages/MesRappels.jsx'
import Notifications from './pages/Notifications.jsx'
import Officine from './pages/Officine.jsx'
import Catalogue from './pages/Catalogue.jsx'
import Retraits from './pages/Retraits.jsx'
import Profil from './pages/Profil.jsx'
import Admin from './pages/Admin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import Statistiques from './pages/Statistiques.jsx'
import AuditJournal from './pages/AuditJournal.jsx'

function Home() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const cible = { pharmacien: '/officine', admin: '/admin' }[user.role] || '/chat'
  return <Navigate to={cible} replace />
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute role="patient">
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/commandes"
          element={
            <ProtectedRoute role="patient">
              <MesCommandes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rappels"
          element={
            <ProtectedRoute role="patient">
              <MesRappels />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute role="patient">
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profil"
          element={
            <ProtectedRoute role="patient">
              <Profil />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officine"
          element={
            <ProtectedRoute role="pharmacien">
              <Officine />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalogue"
          element={
            <ProtectedRoute role="pharmacien">
              <Catalogue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retraits"
          element={
            <ProtectedRoute role="pharmacien">
              <Retraits />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute role="admin">
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute role="admin">
              <AuditJournal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistiques"
          element={
            <ProtectedRoute role="pharmacien">
              <Statistiques />
            </ProtectedRoute>
          }
        />
        <Route
          path="/officine/historique"
          element={
            <ProtectedRoute role="pharmacien">
              <AuditJournal
                endpoint="/officine/historique"
                titre="Historique des activités"
                sousTitre="validations, rejets et retraits de l'officine"
              />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
