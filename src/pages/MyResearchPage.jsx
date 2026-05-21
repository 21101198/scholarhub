import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import PaperCard from '../components/PaperCard'

export default function MyResearchPage() {
  const { user, profile } = useAuth()
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { load() }, [user])

  async function load() {
    const { data } = await supabase
      .from('papers')
      .select('*, profiles(username, full_name), equations(*), feedbacks(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setPapers(data?.map(p => ({ ...p, feedback_count: p.feedbacks?.[0]?.count ?? 0 })) ?? [])
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="page-bar">
        <div>
          <div className="page-title">My Research Portfolio</div>
          <div className="muted sans" style={{ fontSize: 13, marginTop: 4 }}>
            {profile?.full_name || profile?.username} · {papers.length} papers
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/new')}>+ Add Paper</button>
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
        : papers.length === 0
          ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 15, marginBottom: 8 }}>아직 논문이 없어요</div>
              <button className="btn btn-primary" onClick={() => navigate('/new')}>첫 번째 논문 공유하기</button>
            </div>
          )
          : <div className="cards-grid">{papers.map(p => <PaperCard key={p.id} paper={p} />)}</div>
      }
    </div>
  )
}
