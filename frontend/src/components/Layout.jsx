import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  MessageSquare, Package, Bell, User, ClipboardList,
  LayoutDashboard, BookOpen, Users, ShieldCheck,
  LogOut, RefreshCw, History,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import api from '../api/client.js'

function NavItem({ to, icon: Icon, label, badge }) {
  return (
    <NavLink to={to} className={({ isActive }) => isActive ? 'active' : ''}>
      <Icon size={15} />
      {label}
      {badge > 0 && <span className="badge" style={{ position: 'static', margin: '0 0 0 4px' }}>{badge}</span>}
    </NavLink>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [nonLues, setNonLues] = useState(0)
  const [stockBas, setStockBas] = useState(0)

  useEffect(() => {
    if (user?.role !== 'patient') return
    let actif = true
    function refresh() {
      api.get('/notifications').then(({ data }) => actif && setNonLues(data.non_lues)).catch(() => {})
    }
    refresh()
    const id = setInterval(refresh, 30000)
    return () => { actif = false; clearInterval(id) }
  }, [user])

  useEffect(() => {
    if (user?.role !== 'pharmacien') return
    let actif = true
    function refresh() {
      api.get('/officine/medicaments/stock-bas').then(({ data }) => {
        actif && setStockBas(Array.isArray(data?.data) ? data.data.length : (data?.length ?? 0))
      }).catch(() => {})
    }
    refresh()
    const id = setInterval(refresh, 60000)
    return () => { actif = false; clearInterval(id) }
  }, [user])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">℞</span>
          Pharmabot
        </Link>

        {user && (
          <nav className="nav">
            {user.role === 'patient' && (
              <>
                <NavItem to="/chat"          icon={MessageSquare} label="Assistant" />
                <NavItem to="/commandes"     icon={ClipboardList}  label="Commandes" />
                <NavItem to="/rappels"       icon={RefreshCw}      label="Rappels" />
                <NavItem to="/profil"        icon={User}           label="Profil" />
                <NavItem to="/notifications" icon={Bell}           label="Alertes" badge={nonLues} />
              </>
            )}
            {user.role === 'pharmacien' && (
              <>
                <NavItem to="/officine"      icon={LayoutDashboard} label="Officine" />
                <NavItem to="/retraits"      icon={Package}         label="Retraits" />
                <NavItem to="/catalogue"     icon={BookOpen}        label="Catalogue" badge={stockBas} />
                <NavItem to="/statistiques"  icon={ShieldCheck}     label="Statistiques" />
                <NavItem to="/officine/historique" icon={History}   label="Historique" />
              </>
            )}
            {user.role === 'admin' && (
              <>
                <NavItem to="/admin"       icon={LayoutDashboard} label="Tableau de bord" />
                <NavItem to="/admin/users" icon={Users}           label="Utilisateurs" />
                <NavItem to="/admin/audit" icon={ShieldCheck}     label="Audit" />
              </>
            )}

            <span className="nav-sep" />
            <span className="nav-user">{user.name}</span>
            <button className="btn-ghost btn-sm btn-icon" onClick={handleLogout}>
              <LogOut size={14} /> Déconnexion
            </button>
          </nav>
        )}
      </header>

      <main className="content">{children}</main>
    </div>
  )
}
