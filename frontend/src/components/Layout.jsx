import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import api from '../api/client.js'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [nonLues, setNonLues] = useState(0)

  // Compteur de notifications non lues (patient)
  useEffect(() => {
    if (user?.role !== 'patient') return
    let actif = true
    function refresh() {
      api
        .get('/notifications')
        .then(({ data }) => actif && setNonLues(data.non_lues))
        .catch(() => {})
    }
    refresh()
    const id = setInterval(refresh, 30000) // rafraîchissement périodique
    return () => {
      actif = false
      clearInterval(id)
    }
  }, [user])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">℞</span> Pharmabot
        </Link>
        {user && (
          <nav className="nav">
            {user.role === 'patient' && (
              <>
                <Link to="/chat">Assistant</Link>
                <Link to="/commandes">Mes commandes</Link>
                <Link to="/rappels">Rappels</Link>
                <Link to="/profil">Profil</Link>
                <Link to="/notifications" className="notif-link">
                  Notifications
                  {nonLues > 0 && <span className="badge">{nonLues}</span>}
                </Link>
              </>
            )}
            {user.role === 'pharmacien' && (
              <>
                <Link to="/officine">Officine</Link>
                <Link to="/retraits">Retraits</Link>
                <Link to="/catalogue">Catalogue</Link>
                <Link to="/statistiques">Statistiques</Link>
              </>
            )}
            {user.role === 'admin' && (
              <>
                <Link to="/admin">Tableau de bord</Link>
                <Link to="/admin/users">Utilisateurs</Link>
                <Link to="/admin/audit">Journal d'audit</Link>
              </>
            )}
            <span className="nav-user">{user.name}</span>
            <button className="btn-ghost" onClick={handleLogout}>
              Déconnexion
            </button>
          </nav>
        )}
      </header>
      <main className="content">{children}</main>
    </div>
  )
}
