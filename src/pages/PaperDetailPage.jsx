import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function PaperDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [paper, setPaper] = useState(null)
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [fbText, setFbText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: p }, { data: fb }] = await Promise.all([
      supabase.from('papers')
        .select('*, profiles(username, full_name, institution), equations(*), versions(*), paper_files(*)')
        .eq('id', id).single(),
      supabase.from('feedbacks')
        .select('*, profiles(username, full_name)')
        .eq('paper_id', id)
        .order('created_at', { ascending: true })
    ])
    setPaper(p)
    setFeedbacks(fb ?? [])
    setLoading(false)
  }

  async function submitFeedback() {
    if (!fbText.trim() || !user) return
    setSubmitting(true)
    const { data } = await supabase.from('feedbacks').insert({
      paper_id: id,
      user_id: user.id,
      author_name: profile?.full_name || profile?.username,
      content: fbText.trim(),
      is_ai: false
    }).select('*, profiles(username, full_name)').single()
    if (data) setFeedbacks(prev => [...prev, data])
    setFbText('')
    setSubmitting(false)
  }

  async function requestAIFeedback() {
    setAiLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 700,
          messages: [{ role: 'user', content: `You are a rigorous academic peer reviewer. Give 4-5 sentences of specific, constructive feedback on this research.\n\nTitle: ${paper.title}\nAbstract: ${paper.abstract}\nEquations: ${paper.equations?.map(e => e.label + ': ' + e.equation).join('; ') || 'None'}` }]
        })
      })
      const data = await res.json()
      const text = data.content?.map(c => c.text || '').join('') || 'Failed to generate feedback.'
      const { data: fb } = await supabase.from('feedbacks').insert({
        paper_id: id, user_id: user?.id || null,
        author_name: 'AI Review (Claude)', content: text, is_ai: true
      }).select('*, profiles(username, full_name)').single()
      if (fb) setFeedbacks(prev => [...prev, fb])
    } catch (e) { console.error(e) }
    setAiLoading(false)
  }

  async function deleteFeedback(fbId) {
    await supabase.from('feedbacks').delete().eq('id', fbId)
    setFeedbacks(prev => prev.filter(f => f.id !== fbId))
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" /></div>
  if (!paper) return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--muted)' }}>논문을 찾을 수 없어요.</div>

  const isOwner = user?.id === paper.user_id

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }}>← Back</button>

      <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <span className="tag tag-blue sans">{paper.type}</span>
          {isOwner && <button className="btn btn-outline btn-sm" onClick={() => navigate(`/edit/${paper.id}`)}>Edit</button>}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 400, lineHeight: 1.4, marginBottom: '1rem' }}>{paper.title}</h1>
        <div className="sans" style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
              {(paper.profiles?.full_name || paper.profiles?.username || '?')[0].toUpperCase()}
            </div>
            <span style={{ color: 'var(--text)' }}>{paper.profiles?.full_name || paper.profiles?.username}</span>
          </div>
          {paper.profiles?.institution && <span>· {paper.profiles.institution}</span>}
          <span>· {paper.created_at?.slice(0, 10)}</span>
        </div>
        <div className="tags" style={{ marginTop: 12 }}>
          {paper.tags?.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      </div>

      <div className="sec-h">Abstract</div>
      <p style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--text)' }}>{paper.abstract}</p>

      {paper.equations?.length > 0 && <>
        <div className="sec-h">Mathematical Formulations</div>
        {paper.equations.sort((a, b) => a.order_index - b.order_index).map(eq => (
          <div key={eq.id} className="eq-block">
            <div className="eq-label">{eq.label}</div>
            <code style={{ color: 'var(--accent)', fontSize: 14 }}>{eq.equation}</code>
          </div>
        ))}
      </>}

      {paper.versions?.length > 0 && <>
        <div className="sec-h">Version History</div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 1rem' }}>
          {paper.versions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(v => (
            <div key={v.id} className="version-row">
              <span className="tag tag-blue sans">{v.version_tag}</span>
              <span style={{ flex: 1, color: 'var(--muted)', fontSize: 13 }}>{v.note}</span>
              <span className="muted sans" style={{ fontSize: 11 }}>{v.created_at?.slice(0, 10)}</span>
            </div>
          ))}
        </div>
      </>}

      {paper.paper_files?.length > 0 && <>
        <div className="sec-h">첨부 파일</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
          {paper.paper_files.map(f => {
            const ext = f.file_type || f.name.split('.').pop().toLowerCase()
            const icon = { pdf: '📄', docx: '📝', doc: '📝', pptx: '📊', ppt: '📊' }[ext] || '📎'
            const size = f.size < 1024 * 1024 ? (f.size / 1024).toFixed(1) + ' KB' : (f.size / (1024 * 1024)).toFixed(1) + ' MB'
            return (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '12px 16px', textDecoration: 'none'
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span style={{ fontSize: 24 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: 'var(--text)' }}>{f.name}</div>
                  <div className="sans" style={{ fontSize: 11, color: 'var(--muted)' }}>{ext.toUpperCase()} · {size}</div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--sans)' }}>↓ 다운로드</span>
              </a>
            )
          })}
        </div>
      </>}

      <div className="sec-h" style={{ marginTop: '2.5rem' }}>
        Feedback & Discussion
        <span className="tag sans" style={{ fontSize: 11, marginLeft: 6 }}>{feedbacks.length}</span>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: '1rem' }}>
        {feedbacks.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>아직 피드백이 없어요. 첫 번째로 남겨보세요!</div>
        )}
        <div style={{ padding: '0 1.25rem' }}>
          {feedbacks.map(fb => (
            <div key={fb.id} className="fb-item">
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)',
                background: fb.is_ai ? 'rgba(106,191,138,0.15)' : 'rgba(201,169,110,0.15)',
                color: fb.is_ai ? 'var(--green)' : 'var(--accent)'
              }}>
                {fb.is_ai ? '🤖' : (fb.profiles?.full_name || fb.author_name || '?')[0]?.toUpperCase()}
              </div>
              <div className="fb-body">
                <div className="fb-header">
                  <span className="sans" style={{ fontSize: 13, fontWeight: 600, color: fb.is_ai ? 'var(--green)' : 'var(--text)' }}>
                    {fb.profiles?.full_name || fb.author_name || 'Anonymous'}
                  </span>
                  {fb.is_ai && <span className="tag tag-green sans" style={{ fontSize: 10 }}>AI Review</span>}
                  <span className="muted sans" style={{ fontSize: 11 }}>{fb.created_at?.slice(0, 10)}</span>
                  {user?.id === fb.user_id && (
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={() => deleteFeedback(fb.id)}>삭제</button>
                  )}
                </div>
                <div className="fb-text">{fb.content}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', background: 'var(--bg3)' }}>
          <div className="label" style={{ marginBottom: 8 }}>피드백 남기기</div>
          {!user && (
            <div className="alert alert-error" style={{ marginBottom: 10 }}>
              피드백을 남기려면 <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent2)', padding: 0 }} onClick={() => navigate('/auth')}>로그인</button>이 필요해요.
            </div>
          )}
          <textarea className="textarea" style={{ minHeight: 80, marginBottom: 10 }}
            placeholder="이 연구에 대한 생각, 질문, 개선 아이디어를 공유해 주세요..."
            value={fbText} onChange={e => setFbText(e.target.value)} disabled={!user} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ai" onClick={requestAIFeedback} disabled={aiLoading || !user}>
              {aiLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> AI 리뷰 생성 중...</> : '🤖 AI Review 요청'}
            </button>
            <button className="btn btn-primary" onClick={submitFeedback} disabled={!fbText.trim() || !user || submitting}>
              {submitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '↗ Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}