import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PaperCard from '../components/PaperCard'
import { useAuth } from '../App'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [papers, setPapers] = useState([])
  const [stats, setStats] = useState({ papers: 0, feedbacks: 0, users: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: papersData }, { count: paperCount }, { count: fbCount }, { count: userCount }] = await Promise.all([
      supabase.from('papers')
        .select('*, profiles(username, full_name), equations(*), feedbacks(count)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('papers').select('*', { count: 'exact', head: true }),
      supabase.from('feedbacks').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])
    setPapers(papersData?.map(p => ({ ...p, feedback_count: p.feedbacks?.[0]?.count ?? 0 })) ?? [])
    setStats({ papers: paperCount ?? 0, feedbacks: fbCount ?? 0, users: userCount ?? 0 })
    setLoading(false)
  }

  return (
    <>
      <div className="hero">
        <h1 className="hero-title">Where <em>research ideas</em> grow through<br />community feedback</h1>
        <p className="hero-sub">논문 아이디어를 공유하고, 피드백을 받고, 수식과 버전 히스토리를 함께 관리하세요.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {user
            ? <button className="btn btn-primary" onClick={() => navigate('/new')}>+ 논문 아이디어 공유</button>
            : <button className="btn btn-primary" onClick={() => navigate('/auth')}>시작하기</button>
          }
          <button className="btn btn-outline" onClick={() => navigate('/community')}>커뮤니티 보기</button>
        </div>
      </div>

      <div className="stats-row">
        {[['Papers & Ideas', stats.papers], ['Feedback', stats.feedbacks], ['Researchers', stats.users]].map(([l, n]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div className="stat-num">{n}</div>
            <div className="stat-label sans">{l}</div>
          </div>
        ))}
      </div>

      <div className="page">
        <div className="sec-h">Featured Research</div>
        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
          : <div className="cards-grid">{papers.map(p => <PaperCard key={p.id} paper={p} />)}</div>
        }
      </div>
    </>
  )
}
