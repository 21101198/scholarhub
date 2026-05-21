import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function PaperCard({ paper }) {
  const navigate = useNavigate()
  const eq = paper.equations?.[0]

  return (
    <div className="card card-clickable" onClick={() => navigate(`/paper/${paper.id}`)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span className="tag tag-blue sans">{paper.type}</span>
        <span className="muted sans" style={{ fontSize: 11 }}>{paper.created_at?.slice(0, 7)}</span>
      </div>
      <div style={{ fontSize: 15, color: 'var(--text)', marginBottom: 8, lineHeight: 1.5, fontWeight: 400 }}>{paper.title}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 12,
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {paper.abstract}
      </div>

      {eq && (
        <div className="eq-block" style={{ marginBottom: 10, padding: '8px 12px' }}>
          <div className="eq-label">{eq.label}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)' }}>{eq.equation}</div>
        </div>
      )}

      <div className="tags" style={{ marginBottom: 10 }}>
        {paper.tags?.map(t => <span key={t} className="tag">{t}</span>)}
      </div>

      <div className="sans" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
        <span>{paper.profiles?.full_name || paper.profiles?.username || '—'}</span>
        <span style={{ color: 'var(--accent2)' }}>
          💬 {paper.feedback_count ?? 0} feedback
        </span>
      </div>
    </div>
  )
}
