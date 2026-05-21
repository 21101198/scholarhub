import React, { createContext, useContext, useEffect, useState } from 'react'
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'

import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import MyResearchPage from './pages/MyResearchPage'
import CommunityPage from './pages/CommunityPage'
import PaperDetailPage from './pages/PaperDetailPage'
import NewPaperPage from './pages/NewPaperPage'
import EditPaperPage from './pages/EditPaperPage'
import ProfilePage from './pages/ProfilePage'

// ── Auth Context ──────────────────────────────────────────
export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, reloadProfile: () => loadProfile(user?.id) }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Protected route ───────────────────────────────────────
function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
  return user ? children : <Navigate to="/auth" replace />
}

// ── Navbar ────────────────────────────────────────────────
function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    || profile?.username?.[0]?.toUpperCase() || '?'

  return (
    <nav>
      <NavLink to="/" className="nav-logo">ScholarHuB<span>Seoultech</span></NavLink>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Home</NavLink>
        <NavLink to="/community" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Community</NavLink>
        {user && <NavLink to="/my-research" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>My Research</NavLink>}
      </div>
      <div className="nav-user">
        {user ? (
          <>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/new')}>+ Share Idea</button>
            <div className="avatar" style={{ cursor: 'pointer' }} onClick={() => navigate('/profile')} title={profile?.username}>{initials}</div>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
          </>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth')}>Sign in</button>
        )}
      </div>
    </nav>
  )
}

// ── App root ──────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/paper/:id" element={<PaperDetailPage />} />
        <Route path="/my-research" element={<Protected><MyResearchPage /></Protected>} />
        <Route path="/new" element={<Protected><NewPaperPage /></Protected>} />
        <Route path="/edit/:id" element={<Protected><EditPaperPage /></Protected>} />
        <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
      </Routes>
    </AuthProvider>
  )
}
