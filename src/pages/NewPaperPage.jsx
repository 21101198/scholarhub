import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const TYPES = ['Research Idea', 'Research Paper', 'Work in Progress']
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
]

function fileExt(name) { return name.split('.').pop().toLowerCase() }
function fileSize(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
const EXT_ICON = { pdf: '📄', docx: '📝', doc: '📝', pptx: '📊', ppt: '📊' }

export default function NewPaperPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef()
  const [form, setForm] = useState({ type: 'Research Idea', title: '', abstract: '', tags: '' })
  const [equations, setEquations] = useState([{ label: '', equation: '' }])
  const [versionNote, setVersionNote] = useState('Initial submission')
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }))
  function addEq() { setEquations(prev => [...prev, { label: '', equation: '' }]) }
  function removeEq(i) { setEquations(prev => prev.filter((_, idx) => idx !== i)) }
  function updateEq(i, k, v) { setEquations(prev => prev.map((e, idx) => idx === i ? { ...e, [k]: v } : e)) }

  function onFileChange(e) {
    const selected = Array.from(e.target.files)
    const invalid = selected.filter(f => !ALLOWED_TYPES.includes(f.type))
    if (invalid.length > 0) { setError('PDF, Word (.docx), PowerPoint (.pptx) 파일만 업로드 가능해요.'); return }
    setError('')
    setFiles(prev => [...prev, ...selected])
    e.target.value = ''
  }
  function removeFile(i) { setFiles(prev => prev.filter((_, idx) => idx !== i)) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.abstract.trim()) { setError('제목과 초록은 필수예요.'); return }
    setError(''); setLoading(true)

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const { data: paper, error: pErr } = await supabase.from('papers')
      .insert({ user_id: user.id, type: form.type, title: form.title, abstract: form.abstract, tags })
      .select().single()
    if (pErr) { setError(pErr.message); setLoading(false); return }

    const eqs = equations.filter(e => e.label && e.equation)
    if (eqs.length > 0) {
      await supabase.from('equations').insert(eqs.map((e, i) => ({
        paper_id: paper.id, label: e.label, equation: e.equation, order_index: i
      })))
    }
    await supabase.from('versions').insert({ paper_id: paper.id, version_tag: 'v0.1', note: versionNote })

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      setUploadProgress(`파일 업로드 중... (${i + 1}/${files.length}) ${f.name}`)
      const path = `${paper.id}/${Date.now()}_${f.name}`
      const { data: uploaded } = await supabase.storage.from('papers').upload(path, f)
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from('papers').getPublicUrl(path)
        await supabase.from('paper_files').insert({
          paper_id: paper.id, name: f.name, url: publicUrl, size: f.size, file_type: fileExt(f.name)
        })
      }
    }
    navigate(`/paper/${paper.id}`)
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }}>← Back</button>
      <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: '0.5rem' }}>Share Research Idea</h1>
      <p className="muted sans" style={{ fontSize: 13, marginBottom: '2rem' }}>논문 아이디어, 진행 중인 연구, 완성된 논문을 커뮤니티와 공유하세요.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">Type</label>
          <select className="select" value={form.type} onChange={e => u('type', e.target.value)}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="label">Title *</label>
          <input className="input" required placeholder="논문 제목을 입력하세요..." value={form.title} onChange={e => u('title', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="label">Abstract *</label>
          <textarea className="textarea" required style={{ minHeight: 140 }}
            placeholder="연구 아이디어, 동기, 방법론을 설명해 주세요..."
            value={form.abstract} onChange={e => u('abstract', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="label">Tags <span className="muted">(쉼표로 구분)</span></label>
          <input className="input" placeholder="Machine Learning, Optimization, Theory" value={form.tags} onChange={e => u('tags', e.target.value)} />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="label" style={{ margin: 0 }}>Mathematical Formulations <span className="muted">(선택)</span></label>
            <button type="button" className="btn btn-outline btn-sm" onClick={addEq}>+ 수식 추가</button>
          </div>
          {equations.map((eq, i) => (
            <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input className="input" style={{ flex: 1 }} placeholder="수식 이름 (e.g. Loss Function)" value={eq.label} onChange={e => updateEq(i, 'label', e.target.value)} />
                {equations.length > 1 && <button type="button" className="btn btn-danger btn-sm" onClick={() => removeEq(i)}>삭제</button>}
              </div>
              <input className="input" style={{ fontFamily: 'monospace' }}
                placeholder="수식 (e.g. L(θ) = -∑ log p(y|x;θ))"
                value={eq.equation} onChange={e => updateEq(i, 'equation', e.target.value)} />
            </div>
          ))}
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="label" style={{ margin: 0 }}>파일 첨부 <span className="muted">(PDF, Word, PowerPoint)</span></label>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current.click()}>+ 파일 선택</button>
          </div>
          <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx" style={{ display: 'none' }} onChange={onFileChange} />

          {files.length === 0 ? (
            <div onClick={() => fileRef.current.click()} style={{
              border: '2px dashed var(--border2)', borderRadius: 8, padding: '1.5rem',
              textAlign: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: 13
            }}>
              📎 클릭하거나 파일을 드래그해서 올려주세요<br />
              <span style={{ fontSize: 11 }}>PDF · Word (.docx) · PowerPoint (.pptx)</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {files.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 14px'
                }}>
                  <span style={{ fontSize: 20 }}>{EXT_ICON[fileExt(f.name)] || '📄'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fileSize(f.size)}</div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeFile(i)} style={{ color: 'var(--red)' }}>✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => fileRef.current.click()}>+ 더 추가</button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="label">Initial Version Note</label>
          <input className="input" placeholder="v0.1 설명..." value={versionNote} onChange={e => setVersionNote(e.target.value)} />
        </div>

        {uploadProgress && (
          <div className="alert alert-success" style={{ marginBottom: 10 }}>
            <span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />{uploadProgress}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> {uploadProgress || '저장 중...'}</> : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  )
}