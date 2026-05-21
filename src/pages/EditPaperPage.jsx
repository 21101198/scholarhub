import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

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

export default function EditPaperPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef()
  const [form, setForm] = useState(null)
  const [equations, setEquations] = useState([])
  const [newVersionTag, setNewVersionTag] = useState('')
  const [newVersionNote, setNewVersionNote] = useState('')
  const [existingFiles, setExistingFiles] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase
      .from('papers')
      .select('*, equations(*), paper_files(*)')
      .eq('id', id).single()
    if (!data || data.user_id !== user?.id) { navigate('/'); return }
    setForm({ type: data.type, title: data.title, abstract: data.abstract, tags: data.tags?.join(', ') || '' })
    setEquations(data.equations || [])
    setExistingFiles(data.paper_files || [])
    setLoading(false)
  }

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }))
  function addEq() { setEquations(prev => [...prev, { label: '', equation: '' }]) }
  function removeEq(i) { setEquations(prev => prev.filter((_, idx) => idx !== i)) }
  function updateEq(i, k, v) { setEquations(prev => prev.map((e, idx) => idx === i ? { ...e, [k]: v } : e)) }

  function onFileChange(e) {
    const selected = Array.from(e.target.files)
    const invalid = selected.filter(f => !ALLOWED_TYPES.includes(f.type))
    if (invalid.length > 0) { setError('PDF, Word (.docx), PowerPoint (.pptx) 파일만 업로드 가능해요.'); return }
    setError('')
    setNewFiles(prev => [...prev, ...selected])
    e.target.value = ''
  }
  function removeNewFile(i) { setNewFiles(prev => prev.filter((_, idx) => idx !== i)) }

  async function deleteExistingFile(file) {
    await supabase.from('paper_files').delete().eq('id', file.id)
    setExistingFiles(prev => prev.filter(f => f.id !== file.id))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.abstract.trim()) { setError('제목과 초록은 필수예요.'); return }
    setError(''); setSaving(true)

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    await supabase.from('papers').update({ type: form.type, title: form.title, abstract: form.abstract, tags }).eq('id', id)

    await supabase.from('equations').delete().eq('paper_id', id)
    const eqs = equations.filter(e => e.label && e.equation)
    if (eqs.length > 0) {
      await supabase.from('equations').insert(eqs.map((e, i) => ({
        paper_id: id, label: e.label, equation: e.equation, order_index: i
      })))
    }

    if (newVersionTag.trim() && newVersionNote.trim()) {
      await supabase.from('versions').insert({ paper_id: id, version_tag: newVersionTag.trim(), note: newVersionNote.trim() })
    }

    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i]
      setUploadProgress(`파일 업로드 중... (${i + 1}/${newFiles.length}) ${f.name}`)
      const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${id}/${Date.now()}_${safeName}`
      const { data: uploaded } = await supabase.storage.from('papers').upload(path, f)
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from('papers').getPublicUrl(path)
        await supabase.from('paper_files').insert({
          paper_id: id, name: f.name, url: publicUrl, size: f.size, file_type: fileExt(f.name)
        })
      }
    }
    navigate(`/paper/${id}`)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" /></div>

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }}>← Back</button>
      <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: '2rem' }}>Edit Paper</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label className="label">Type</label>
          <select className="select" value={form.type} onChange={e => u('type', e.target.value)}>
            {['Research Idea', 'Research Paper', 'Work in Progress'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Title *</label>
          <input className="input" required value={form.title} onChange={e => u('title', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Abstract *</label>
          <textarea className="textarea" required style={{ minHeight: 140 }} value={form.abstract} onChange={e => u('abstract', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Tags</label>
          <input className="input" placeholder="Machine Learning, Optimization" value={form.tags} onChange={e => u('tags', e.target.value)} />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="label" style={{ margin: 0 }}>Mathematical Formulations</label>
            <button type="button" className="btn btn-outline btn-sm" onClick={addEq}>+ 추가</button>
          </div>
          {equations.map((eq, i) => (
            <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input className="input" style={{ flex: 1 }} placeholder="수식 이름" value={eq.label} onChange={e => updateEq(i, 'label', e.target.value)} />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeEq(i)}>삭제</button>
              </div>
              <input className="input" style={{ fontFamily: 'monospace' }} placeholder="수식" value={eq.equation} onChange={e => updateEq(i, 'equation', e.target.value)} />
            </div>
          ))}
        </div>

        <div className="form-group">
          <label className="label">첨부 파일</label>
          {existingFiles.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div className="muted sans" style={{ fontSize: 11, marginBottom: 6 }}>기존 파일</div>
              {existingFiles.map(f => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 6
                }}>
                  <span style={{ fontSize: 20 }}>{EXT_ICON[f.file_type] || '📄'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{f.file_type?.toUpperCase()}</div>
                  </div>
                  <a href={f.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>↓</a>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => deleteExistingFile(f)} style={{ color: 'var(--red)' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="muted sans" style={{ fontSize: 11, marginBottom: 6 }}>새 파일 추가</div>
          <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx" style={{ display: 'none' }} onChange={onFileChange} />

          {newFiles.length === 0 ? (
            <div onClick={() => fileRef.current.click()} style={{
              border: '2px dashed var(--border2)', borderRadius: 8, padding: '1.25rem',
              textAlign: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: 13
            }}>
              📎 클릭해서 파일 추가<br />
              <span style={{ fontSize: 11 }}>PDF · Word (.docx) · PowerPoint (.pptx)</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {newFiles.map((f, i) => (
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
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeNewFile(i)} style={{ color: 'var(--red)' }}>✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => fileRef.current.click()}>+ 더 추가</button>
            </div>
          )}
        </div>

        <div className="form-group" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
          <label className="label">새 버전 추가 <span className="muted">(선택)</span></label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" style={{ width: 100 }} placeholder="v1.1" value={newVersionTag} onChange={e => setNewVersionTag(e.target.value)} />
            <input className="input" style={{ flex: 1 }} placeholder="변경 내용 설명..." value={newVersionNote} onChange={e => setNewVersionNote(e.target.value)} />
          </div>
        </div>

        {uploadProgress && (
          <div className="alert alert-success" style={{ margin: '10px 0' }}>
            <span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />{uploadProgress}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> {uploadProgress || '저장 중...'}</> : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}