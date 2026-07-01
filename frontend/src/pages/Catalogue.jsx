import { useEffect, useState } from 'react'
import api from '../api/client.js'

const VIDE = { designation: '', code_barre: '', quantite_stock: 0, prix: 0, description_technique: '' }
const SEUIL = 10

export default function Catalogue() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(VIDE)
  const [editId, setEditId] = useState(null)
  const [erreur, setErreur] = useState(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [dernierePage, setDernierePage] = useState(1)

  function charger(p = 1) {
    setLoading(true)
    api
      .get('/medicaments', { params: { ...(q ? { q } : {}), page: p } })
      .then(({ data }) => {
        const meta = data.meta ?? data
        setItems(data.data ?? data)
        setPage(meta.current_page ?? 1)
        setDernierePage(meta.last_page ?? 1)
      })
      .finally(() => setLoading(false))
  }

  useEffect(charger, []) // eslint-disable-line react-hooks/exhaustive-deps

  function maj(champ) {
    return (e) => setForm({ ...form, [champ]: e.target.value })
  }

  function editer(m) {
    setEditId(m.id)
    setForm({
      designation: m.designation,
      code_barre: m.code_barre ?? '',
      quantite_stock: m.quantite_stock,
      prix: m.prix,
      description_technique: m.description_technique ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function annuler() {
    setEditId(null)
    setForm(VIDE)
    setErreur(null)
  }

  async function soumettre(e) {
    e.preventDefault()
    setErreur(null)
    try {
      if (editId) {
        await api.put(`/officine/medicaments/${editId}`, form)
      } else {
        await api.post('/officine/medicaments', form)
      }
      annuler()
      charger()
    } catch (err) {
      const errs = err.response?.data?.errors
      setErreur(errs ? Object.values(errs).flat().join(' ') : 'Enregistrement impossible.')
    }
  }

  async function supprimer(id) {
    if (!window.confirm('Supprimer ce médicament du catalogue ?')) return
    await api.delete(`/officine/medicaments/${id}`)
    charger()
  }

  return (
    <div className="page">
      <h1>Catalogue</h1>

      <form className="card form-med" onSubmit={soumettre}>
        <h3>{editId ? 'Modifier le médicament' : 'Ajouter un médicament'}</h3>
        {erreur && <div className="alert">{erreur}</div>}
        <div className="grid2">
          <label>
            Désignation
            <input value={form.designation} onChange={maj('designation')} required />
          </label>
          <label>
            Code-barres
            <input value={form.code_barre} onChange={maj('code_barre')} />
          </label>
          <label>
            Stock
            <input type="number" min="0" value={form.quantite_stock} onChange={maj('quantite_stock')} required />
          </label>
          <label>
            Prix (FCFA)
            <input type="number" min="0" step="0.01" value={form.prix} onChange={maj('prix')} required />
          </label>
        </div>
        <label>
          Description technique
          <textarea rows="2" value={form.description_technique} onChange={maj('description_technique')} />
        </label>
        <div className="actions">
          <button className="btn-primary">{editId ? 'Enregistrer' : 'Ajouter'}</button>
          {editId && (
            <button type="button" className="btn-ghost" onClick={annuler}>
              Annuler
            </button>
          )}
        </div>
      </form>

      <div className="search-row">
        <input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-ghost" onClick={() => charger(1)}>
          Rechercher
        </button>
      </div>

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Stock</th>
              <th>Prix</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className={m.quantite_stock <= SEUIL ? 'low' : ''}>
                <td>{m.designation}</td>
                <td>
                  {m.quantite_stock}
                  {m.quantite_stock <= SEUIL && <span className="tag danger">bas</span>}
                </td>
                <td>{Number(m.prix).toFixed(0)} FCFA</td>
                <td className="row-actions">
                  <button className="btn-ghost" onClick={() => editer(m)}>
                    Modifier
                  </button>
                  <button className="btn-danger" onClick={() => supprimer(m.id)}>
                    Suppr.
                  </button>
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
          <span className="muted">
            Page {page} / {dernierePage}
          </span>
          <button className="btn-ghost" disabled={page >= dernierePage} onClick={() => charger(page + 1)}>
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}
