import { useEffect, useState } from 'react'
import { UserPlus, Pencil, Trash2, Save, X } from 'lucide-react'
import api from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'

const ROLES = [
  { value: 'patient', label: 'Patient' },
  { value: 'pharmacien', label: 'Pharmacien' },
  { value: 'admin', label: 'Administrateur' },
]
const ROLE_BADGE = {
  patient: 'tag',
  pharmacien: 'tag tag-pharmacien',
  admin: 'tag tag-admin',
}

const VIDE = { name: '', email: '', password: '', role: 'pharmacien' }

export default function Admin() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(VIDE)
  const [erreur, setErreur] = useState(null)
  const [succes, setSucces] = useState(null)
  const [page, setPage] = useState(1)
  const [dernierePage, setDernierePage] = useState(1)
  const [total, setTotal] = useState(0)
  const [recherche, setRecherche] = useState('')
  const [filtreRole, setFiltreRole] = useState('')
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})

  function charger(p = 1) {
    setLoading(true)
    api
      .get('/admin/users', {
        params: { page: p, q: recherche || undefined, role: filtreRole || undefined },
      })
      .then(({ data }) => {
        const meta = data.meta ?? {}
        setUsers(data.data ?? data)
        setPage(meta.current_page ?? 1)
        setDernierePage(meta.last_page ?? 1)
        setTotal(meta.total ?? 0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(() => charger(1), 300)
    return () => clearTimeout(t)
  }, [recherche, filtreRole])

  function maj(champ) {
    return (e) => setForm({ ...form, [champ]: e.target.value })
  }

  async function creer(e) {
    e.preventDefault()
    setErreur(null)
    setSucces(null)
    try {
      await api.post('/admin/users', form)
      setForm(VIDE)
      setSucces(`Compte "${form.name}" créé avec succès.`)
      charger(1)
    } catch (err) {
      const errs = err.response?.data?.errors
      setErreur(errs ? Object.values(errs).flat().join(' ') : 'Création impossible.')
    }
  }

  async function sauvegarderEdit(id) {
    try {
      await api.put(`/admin/users/${id}`, editData)
      setEditId(null)
      charger(page)
    } catch (err) {
      alert(err.response?.data?.message || 'Mise à jour impossible.')
    }
  }

  async function changerRole(id, role) {
    await api.put(`/admin/users/${id}`, { role })
    charger(page)
  }

  async function supprimer(id, nom) {
    if (!window.confirm(`Supprimer le compte de "${nom}" ? Cette action est irréversible.`)) return
    try {
      await api.delete(`/admin/users/${id}`)
      charger(page)
    } catch (err) {
      alert(err.response?.data?.message || 'Suppression impossible.')
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Utilisateurs</h1>
          {total > 0 && <p className="page-subtitle">{total} compte{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}</p>}
        </div>
      </div>

      {/* Formulaire création */}
      <form className="card form-med" onSubmit={creer}>
        <h3>Créer un compte</h3>
        {erreur && <div className="alert">{erreur}</div>}
        {succes && <div className="alert-ok">{succes}</div>}
        <div className="grid2">
          <label>
            Nom
            <input value={form.name} onChange={maj('name')} required placeholder="Jean Dupont" />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={maj('email')} required placeholder="jean@exemple.com" />
          </label>
          <label>
            Mot de passe
            <input type="password" value={form.password} onChange={maj('password')} required placeholder="Min. 8 caractères" />
          </label>
          <label>
            Rôle
            <select value={form.role} onChange={maj('role')}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="actions">
          <button className="btn-primary btn-icon"><UserPlus size={15} /> Créer le compte</button>
        </div>
      </form>

      {/* Filtres */}
      <div className="filters-row">
        <input
          className="search-input"
          placeholder="Rechercher par nom ou email…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <select value={filtreRole} onChange={(e) => setFiltreRole(e.target.value)}>
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      {loading ? (
        <p className="muted">Chargement…</p>
      ) : users.length === 0 ? (
        <p className="muted">Aucun utilisateur trouvé.</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Créé le</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {editId === u.id ? (
                    <input
                      value={editData.name ?? u.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="inline-input"
                    />
                  ) : (
                    <span>
                      {u.name}
                      {u.id === user.id && <span className="tag tag-admin" style={{ marginLeft: 6 }}>Vous</span>}
                    </span>
                  )}
                </td>
                <td className="muted">{u.email}</td>
                <td>
                  {editId === u.id ? (
                    <select
                      value={editData.role ?? u.role}
                      onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={ROLE_BADGE[u.role] ?? 'tag'}>
                      {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                    </span>
                  )}
                </td>
                <td className="muted">
                  {u.created_at
                    ? new Date(u.created_at).toLocaleDateString('fr-FR')
                    : '—'}
                </td>
                <td className="row-actions">
                  {editId === u.id ? (
                    <>
                      <button className="btn-primary btn-sm btn-icon" onClick={() => sauvegarderEdit(u.id)}>
                        <Save size={13} /> Sauvegarder
                      </button>
                      <button className="btn-ghost btn-sm btn-icon" onClick={() => setEditId(null)}>
                        <X size={13} /> Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn-ghost btn-sm btn-icon"
                        onClick={() => { setEditId(u.id); setEditData({ name: u.name, role: u.role }) }}
                      >
                        <Pencil size={13} /> Modifier
                      </button>
                      {u.id !== user.id && (
                        <button className="btn-danger btn-sm btn-icon" onClick={() => supprimer(u.id, u.name)}>
                          <Trash2 size={13} /> Supprimer
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {dernierePage > 1 && (
        <div className="pagination">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => charger(page - 1)}>
            Précédent
          </button>
          <span className="muted">Page {page} / {dernierePage}</span>
          <button className="btn-ghost" disabled={page >= dernierePage} onClick={() => charger(page + 1)}>
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}
