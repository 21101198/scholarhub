import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function ProfilePage() {
  const { profile, reloadProfile } = useAuth()
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    username: profile?.username || '',
    institution: profile?.institution || '',
    bio: profile?.bio || ''
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)
    const { error } = await supabase.from('profiles').update(form).eq('id', profile.id)
    if (error) { setError(error.message) }
    else { setSuccess(true); reloadProfile() }
    setSaving(false)
  }

  const initials = form.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || form.username?.[0]?.toUpperCase() || '?'

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: '2rem' }}>My Profile</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '2rem' }}>
        <div className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{initials}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{form.full_name || form.username}</div>
          <div className="muted sans" style={{ fontSize: 13 }}>@{form.username}</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">프로필이 업데이트됐어요!</div>}

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label className="label">Full Name</label>
          <input className="input" value={form.full_name} onChange={e => u('full_name', e.target.value)} placeholder="Kim Minsu" />
        </div>
        <div className="form-group">
          <label className="label">Username</label>
          <input className="input" value={form.username} onChange={e => u('username', e.target.value.toLowerCase().replace(/\s/g, ''))} />
        </div>
        <div className="form-group">
          <label className="label">Institution / Affiliation</label>
          <input className="input" value={form.institution} onChange={e => u('institution', e.target.value)} placeholder="Seoul National University" />
        </div>
        <div className="form-group">
          <label className="label">Bio</label>
          <textarea className="textarea" value={form.bio} onChange={e => u('bio', e.target.value)} placeholder="간단한 연구 소개..." />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> 저장 중...</> : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
