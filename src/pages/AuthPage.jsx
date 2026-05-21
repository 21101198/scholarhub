import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('login')  // 'login' | 'signup'
  const [form, setForm] = useState({ email: '', password: '', username: '', full_name: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { username: form.username, full_name: form.full_name } }
        })
        if (error) throw error
        setSuccess('계정이 생성됐어요! 이메일을 확인해 주세요.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        if (error) throw error
        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">ScholarHub SeoulTech</div>
        <div className="auth-sub">{mode === 'login' ? '다시 오신 걸 환영해요' : '연구자 커뮤니티에 합류하세요'}</div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label className="label">Full Name</label>
                <input className="input" required value={form.full_name} onChange={e => u('full_name', e.target.value)} placeholder="Kim Minsu" />
              </div>
              <div className="form-group">
                <label className="label">Username</label>
                <input className="input" required value={form.username} onChange={e => u('username', e.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="minsu_kim" />
              </div>
            </>
          )}
          <div className="form-group">
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={e => u('email', e.target.value)} placeholder="you@university.edu" />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input className="input" type="password" required minLength={6} value={form.password} onChange={e => u('password', e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? <><span className="spinner" /> 처리 중...</> : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>계정이 없으신가요? <button onClick={() => setMode('signup')}>회원가입</button></>
          ) : (
            <>이미 계정이 있으신가요? <button onClick={() => setMode('login')}>로그인</button></>
          )}
        </div>
      </div>
    </div>
  )
}
