import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const PIE_COLORS = ['#3ECF8E', '#F5A623', '#F4645C', '#6C8EF5', '#B57EDC', '#4EC9C0', '#F58EBB', '#E0C341']

export default function BudgetSection({ session, transactions, categories, colors, font }) {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [limitInput, setLimitInput] = useState('')

  const expenseCategories = categories.filter((c) => c.type === 'expense')

  useEffect(() => {
    fetchBudgets()
  }, [])

  const fetchBudgets = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('budgets').select('*, categories(name)')
    if (!error) setBudgets(data)
    setLoading(false)
  }

  const handleSetBudget = async (e) => {
    e.preventDefault()
    if (!categoryId || !limitInput) return

    const { error } = await supabase
      .from('budgets')
      .upsert(
        { user_id: session.user.id, category_id: categoryId, monthly_limit: parseFloat(limitInput) },
        { onConflict: 'user_id,category_id' }
      )

    if (!error) {
      setCategoryId('')
      setLimitInput('')
      setShowEditor(false)
      fetchBudgets()
    } else {
      alert('Error saving budget: ' + error.message)
    }
  }

  const handleDeleteBudget = async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (!error) fetchBudgets()
  }

  // Spend per category, from all expense transactions
  const spendByCategory = {}
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const catId = t.category_id
      spendByCategory[catId] = (spendByCategory[catId] || 0) + Number(t.amount)
    })

  const pieData = Object.entries(spendByCategory).map(([catId, amount]) => {
    const cat = categories.find((c) => c.id === catId)
    return { name: cat?.name || 'Other', value: amount }
  })

  const cardStyle = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  }

  return (
    <div>
      {/* Pie chart: spending breakdown */}
      {pieData.length > 0 && (
        <div style={cardStyle}>
          <p style={{ fontFamily: font.display, fontWeight: 600, fontSize: 15, color: colors.text, margin: '0 0 12px' }}>
            Spending breakdown
          </p>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `₦${Number(value).toLocaleString()}`}
                  contentStyle={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
            {pieData.map((entry, index) => (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span style={{ fontSize: 12, color: colors.textMuted }}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budgets list */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontFamily: font.display, fontWeight: 600, fontSize: 15, color: colors.text, margin: 0 }}>
            Budgets
          </p>
          <button
            onClick={() => setShowEditor(!showEditor)}
            style={{
              background: 'none',
              border: 'none',
              color: colors.green,
              fontFamily: font.body,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {showEditor ? 'Cancel' : '+ Set budget'}
          </button>
        </div>

        {showEditor && (
          <form onSubmit={handleSetBudget} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              style={{
                flex: '1 1 140px',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                color: colors.text,
                fontSize: 14,
                fontFamily: font.body,
              }}
            >
              <option value="">Category</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="₦ limit"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              required
              style={{
                flex: '1 1 100px',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                color: colors.text,
                fontSize: 14,
                fontFamily: font.body,
              }}
            />
            <button
              type="submit"
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: 'none',
                background: colors.green,
                color: '#08110D',
                fontFamily: font.body,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </form>
        )}

        {loading ? (
          <p style={{ color: colors.textMuted, fontSize: 14 }}>Loading...</p>
        ) : budgets.length === 0 ? (
          <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>
            No budgets set yet — tap "Set budget" to start.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {budgets.map((b) => {
              const spent = spendByCategory[b.category_id] || 0
              const pct = Math.min((spent / Number(b.monthly_limit)) * 100, 100)
              const over = spent > Number(b.monthly_limit)
              const barColor = over ? colors.red : pct > 80 ? colors.amber : colors.green

              return (
                <div key={b.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>
                      {b.categories?.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: over ? colors.red : colors.textMuted }}>
                        ₦{spent.toLocaleString()} / ₦{Number(b.monthly_limit).toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleDeleteBudget(b.id)}
                        style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 15, padding: 0, lineHeight: 1 }}
                        aria-label="Delete budget"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: colors.bg, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
