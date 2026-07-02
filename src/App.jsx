import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const colors = {
  bg: '#0F1115',
  surface: '#1A1D24',
  surfaceHover: '#20242C',
  border: '#2A2E38',
  text: '#E8E9ED',
  textMuted: '#8B8F98',
  green: '#3ECF8E',
  amber: '#F5A623',
  red: '#F4645C',
}

const font = {
  display: "'Space Grotesk', 'Segoe UI', sans-serif",
  body: "'Inter', 'Segoe UI', sans-serif",
}

export default function App() {
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const link = document.createElement("link")
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
    link.rel = "stylesheet"
    document.head.appendChild(link)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setCheckingSession(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (checkingSession) {
    return (
      <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: colors.textMuted, fontFamily: font.body }}>Loading...</p>
      </div>
    )
  }

  return session ? <Dashboard session={session} /> : <Auth />
}

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: font.body,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: colors.green,
            color: colors.bg,
            fontFamily: font.display,
            fontWeight: 700,
            fontSize: 24,
            marginBottom: 16,
          }}>
            ₦
          </div>
          <h1 style={{
            fontFamily: font.display,
            fontSize: 28,
            fontWeight: 700,
            color: colors.text,
            margin: 0,
          }}>
            Naira Tracker
          </h1>
          <p style={{ color: colors.textMuted, marginTop: 8, fontSize: 15 }}>
            {isSignUp ? 'Create your account to start tracking' : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 24,
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: error ? 12 : 20 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ color: colors.red, fontSize: 13, marginBottom: 16 }}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, color: colors.textMuted, fontSize: 14 }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: colors.green, cursor: 'pointer', fontSize: 14, fontFamily: font.body, fontWeight: 600 }}
          >
            {isSignUp ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}

function Dashboard({ session }) {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [amount, setAmount] = useState('')
  const [type, setType] = useState('expense')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    fetchCategories()
    fetchTransactions()
  }, [])

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (!error) setCategories(data)
  }

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(name)')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error) setTransactions(data)
    setLoading(false)
  }

  const handleAddTransaction = async (e) => {
    e.preventDefault()
    if (!amount || !categoryId) return

    const { error } = await supabase.from('transactions').insert({
      user_id: session.user.id,
      amount: parseFloat(amount),
      type,
      category_id: categoryId,
      note,
    })

    if (!error) {
      setAmount('')
      setNote('')
      setCategoryId('')
      setShowForm(false)
      fetchTransactions()
    } else {
      alert('Error adding transaction: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) fetchTransactions()
  }

  const filteredCategories = categories.filter((c) => c.type === type)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
  const balance = totalIncome - totalExpense

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, fontFamily: font.body, color: colors.text, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 0', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: colors.green, color: colors.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: font.display, fontWeight: 700, fontSize: 15,
            }}>₦</div>
            <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17 }}>Naira Tracker</span>
          </div>
          <button onClick={() => supabase.auth.signOut()} style={ghostButtonStyle}>
            Log out
          </button>
        </div>

        {/* Balance hero */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.surface} 0%, #16191F 100%)`,
          border: `1px solid ${colors.border}`,
          borderRadius: 20,
          padding: '28px 24px',
          marginBottom: 20,
        }}>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: 0, letterSpacing: 0.3 }}>YOUR BALANCE</p>
          <p style={{
            fontFamily: font.display,
            fontSize: 40,
            fontWeight: 700,
            margin: '6px 0 20px',
            color: balance >= 0 ? colors.text : colors.red,
          }}>
            ₦{balance.toLocaleString()}
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <p style={{ color: colors.textMuted, fontSize: 12, margin: 0 }}>Income</p>
              <p style={{ color: colors.green, fontFamily: font.display, fontWeight: 600, fontSize: 17, margin: '2px 0 0' }}>
                +₦{totalIncome.toLocaleString()}
              </p>
            </div>
            <div>
              <p style={{ color: colors.textMuted, fontSize: 12, margin: 0 }}>Expenses</p>
              <p style={{ color: colors.red, fontFamily: font.display, fontWeight: 600, fontSize: 17, margin: '2px 0 0' }}>
                -₦{totalExpense.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Add transaction toggle */}
        {!showForm ? (
          <button onClick={() => setShowForm(true)} style={{ ...primaryButtonStyle, marginBottom: 24 }}>
            + Add transaction
          </button>
        ) : (
          <form onSubmit={handleAddTransaction} style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <TypeToggle active={type === 'expense'} onClick={() => { setType('expense'); setCategoryId('') }} color={colors.red}>
                Expense
              </TypeToggle>
              <TypeToggle active={type === 'income'} onClick={() => { setType('income'); setCategoryId('') }} color={colors.green}>
                Income
              </TypeToggle>
            </div>

            <div style={{ marginBottom: 12 }}>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{ ...inputStyle, fontSize: 22, fontFamily: font.display, fontWeight: 600 }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required style={inputStyle}>
                <option value="">Select category</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ ...ghostButtonStyle, flex: 1, padding: '12px 0' }}>
                Cancel
              </button>
              <button type="submit" style={{ ...primaryButtonStyle, flex: 2 }}>
                Add {type === 'expense' ? 'expense' : 'income'}
              </button>
            </div>
          </form>
        )}

        {/* Transactions */}
        <p style={{ fontFamily: font.display, fontWeight: 600, fontSize: 15, color: colors.textMuted, marginBottom: 12 }}>
          RECENT TRANSACTIONS
        </p>

        {loading ? (
          <p style={{ color: colors.textMuted }}>Loading...</p>
        ) : transactions.length === 0 ? (
          <div style={{
            border: `1px dashed ${colors.border}`,
            borderRadius: 16,
            padding: '32px 20px',
            textAlign: 'center',
          }}>
            <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>
              No transactions yet — add your first one above.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transactions.map((t) => (
              <div key={t.id} style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: t.type === 'income' ? 'rgba(62,207,142,0.12)' : 'rgba(244,100,92,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                    color: t.type === 'income' ? colors.green : colors.red,
                    fontFamily: font.display,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {t.type === 'income' ? '↓' : '↑'}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                      {t.categories?.name}{t.note ? ` · ${t.note}` : ''}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.textMuted }}>
                      {t.transaction_date}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontFamily: font.display,
                    fontWeight: 600,
                    fontSize: 15,
                    color: t.type === 'income' ? colors.green : colors.red,
                  }}>
                    {t.type === 'income' ? '+' : '-'}₦{Number(t.amount).toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1 }}
                    aria-label="Delete transaction"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypeToggle({ active, onClick, color, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 0',
        borderRadius: 10,
        border: `1px solid ${active ? color : colors.border}`,
        background: active ? `${color}1F` : 'transparent',
        color: active ? color : colors.textMuted,
        fontFamily: font.body,
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 13,
  color: colors.textMuted,
  marginBottom: 6,
  fontWeight: 500,
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  background: colors.bg,
  color: colors.text,
  fontSize: 15,
  fontFamily: font.body,
  outline: 'none',
  boxSizing: 'border-box',
}

const primaryButtonStyle = {
  width: '100%',
  padding: '13px 0',
  borderRadius: 10,
  border: 'none',
  background: colors.green,
  color: '#08110D',
  fontFamily: font.body,
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
}

const ghostButtonStyle = {
  padding: '8px 14px',
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: 'transparent',
  color: colors.textMuted,
  fontFamily: font.body,
  fontWeight: 500,
  fontSize: 13,
  cursor: 'pointer',
}
