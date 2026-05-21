import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PaperCard from '../components/PaperCard'
import { useNavigate } from 'react-router-dom'

const TYPES = ['All', 'Research Paper', 'Research Idea', 'Work in Progress']

export default function CommunityPage() {
  const [papers, setPapers] = useState([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let q = supabase
      .from('papers')
      .select('*, profiles(username, full_name), equations(*), feedbacks(count)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
    if (filter !== 'All') q = q.eq('type', filter)
    const { data } = await q
    setPapers(data?.map(p => ({ ...p, feedback_count: p.feedbacks?.[0]?.count ?? 0 })) ?? [])
    setLoading(false)
  }

  const filtered = search
    ? papers.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())))
    : papers

  return (
    <div className="page">
      <div className="page-bar">
        <div className="page-title">Community Research Ideas</div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/new')}>+ Share Idea</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          className="input"
          style={{ maxWidth: 280, padding: '6px 12px', fontSize: 13 }}
          placeholder="🔍 논문 제목 또는 태그 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-bar">
        {TYPES.map(t => (
          <button key={t} className={`filter-btn ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
        : filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', fontSize: 14 }}>검색 결과가 없어요.</div>
          : <div className="cards-grid">{filtered.map(p => <PaperCard key={p.id} paper={p} />)}</div>
      }
    </div>
  )
}
