import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'

function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted) setUser(session?.user ?? null)
      setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}

function TextInput({ label, placeholder, value, onChange, type = 'text' }) {
  return (
    <label className="block text-sm text-blue-200/80">
      <span className="mb-1 block text-blue-200">{label}</span>
      <input
        type={type}
        className="w-full rounded-lg bg-slate-900/60 border border-blue-500/30 text-blue-50 px-3 py-2 outline-none focus:border-blue-400 transition"
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function NumberInput(props) {
  return <TextInput {...props} type="number" />
}

function DateInput(props) {
  return <TextInput {...props} type="date" />
}

function Section({ title, children, onSave, saving }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      {children}
    </div>
  )
}

function Toast({ message, type, onClose }) {
  if (!message) return null
  const color = type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
  return (
    <div className={`fixed bottom-6 right-6 ${color} text-white px-4 py-2 rounded-lg shadow-lg`}
      onClick={onClose}
    >
      {message}
    </div>
  )
}

function App() {
  const { user, loading: authLoading } = useAuth()
  const [toast, setToast] = useState({ message: '', type: 'success' })

  // Local form states
  const [bankAmount, setBankAmount] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseMonth, setExpenseMonth] = useState('')
  const [salesAmount, setSalesAmount] = useState('')
  const [ordersTotal, setOrdersTotal] = useState('')
  const [ordersPending, setOrdersPending] = useState('')
  const [ordersCompleted, setOrdersCompleted] = useState('')
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderDate, setReminderDate] = useState('')

  // Loading states
  const [saving, setSaving] = useState({})

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type }), 2000)
  }

  // Fetch initial data when user logs in
  useEffect(() => {
    if (!user) return

    const fetchAll = async () => {
      const uid = user.id
      // bank_balance (single latest row)
      const { data: bank } = await supabase
        .from('bank_balance')
        .select('*')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (bank) setBankAmount(bank.amount ?? '')

      // expenses (latest)
      const { data: exp } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (exp) {
        setExpenseAmount(exp.amount ?? '')
        setExpenseMonth(exp.month ?? '')
      }

      // sales (latest)
      const { data: sale } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (sale) setSalesAmount(sale.amount ?? '')

      // orders (latest)
      const { data: ord } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (ord) {
        setOrdersTotal(ord.total_orders ?? '')
        setOrdersPending(ord.pending ?? '')
        setOrdersCompleted(ord.completed ?? '')
      }

      // reminders (latest)
      const { data: rem } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (rem) {
        setReminderTitle(rem.title ?? '')
        setReminderDate(rem.due_date ? rem.due_date.substring(0, 10) : '')
      }
    }

    fetchAll()
  }, [user])

  // Realtime subscriptions per table for current user
  useEffect(() => {
    if (!user) return
    const uid = user.id

    const channel = supabase.channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bank_balance', filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new || payload.old
          if (row?.user_id !== uid) return
          setBankAmount(row.amount ?? '')
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new || payload.old
          if (row?.user_id !== uid) return
          setExpenseAmount(row.amount ?? '')
          setExpenseMonth(row.month ?? '')
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales', filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new || payload.old
          if (row?.user_id !== uid) return
          setSalesAmount(row.amount ?? '')
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new || payload.old
          if (row?.user_id !== uid) return
          setOrdersTotal(row.total_orders ?? '')
          setOrdersPending(row.pending ?? '')
          setOrdersCompleted(row.completed ?? '')
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminders', filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new || payload.old
          if (row?.user_id !== uid) return
          setReminderTitle(row.title ?? '')
          setReminderDate(row.due_date ? row.due_date.substring(0,10) : '')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const upsertSingle = async (table, values) => {
    if (!user) return
    const uid = user.id
    const payload = { ...values, user_id: uid }

    // Prefer upsert to keep a single record per user in each table
    const { error } = await supabase
      .from(table)
      .upsert(payload, { onConflict: 'user_id' })

    if (error) throw error
  }

  const saveBank = async () => {
    try {
      setSaving((s) => ({ ...s, bank: true }))
      await upsertSingle('bank_balance', { amount: bankAmount === '' ? null : Number(bankAmount) })
      showToast('Bank balance saved')
    } catch (e) {
      showToast(e.message || 'Error saving bank balance', 'error')
    } finally {
      setSaving((s) => ({ ...s, bank: false }))
    }
  }

  const saveExpense = async () => {
    try {
      setSaving((s) => ({ ...s, expenses: true }))
      await upsertSingle('expenses', {
        amount: expenseAmount === '' ? null : Number(expenseAmount),
        month: expenseMonth || null,
      })
      showToast('Expenses saved')
    } catch (e) {
      showToast(e.message || 'Error saving expenses', 'error')
    } finally {
      setSaving((s) => ({ ...s, expenses: false }))
    }
  }

  const saveSales = async () => {
    try {
      setSaving((s) => ({ ...s, sales: true }))
      await upsertSingle('sales', { amount: salesAmount === '' ? null : Number(salesAmount) })
      showToast('Sales saved')
    } catch (e) {
      showToast(e.message || 'Error saving sales', 'error')
    } finally {
      setSaving((s) => ({ ...s, sales: false }))
    }
  }

  const saveOrders = async () => {
    try {
      setSaving((s) => ({ ...s, orders: true }))
      await upsertSingle('orders', {
        total_orders: ordersTotal === '' ? null : parseInt(ordersTotal, 10),
        pending: ordersPending === '' ? null : parseInt(ordersPending, 10),
        completed: ordersCompleted === '' ? null : parseInt(ordersCompleted, 10),
      })
      showToast('Orders saved')
    } catch (e) {
      showToast(e.message || 'Error saving orders', 'error')
    } finally {
      setSaving((s) => ({ ...s, orders: false }))
    }
  }

  const saveReminder = async () => {
    try {
      setSaving((s) => ({ ...s, reminders: true }))
      await upsertSingle('reminders', {
        title: reminderTitle || null,
        due_date: reminderDate || null,
      })
      showToast('Reminder saved')
    } catch (e) {
      showToast(e.message || 'Error saving reminder', 'error')
    } finally {
      setSaving((s) => ({ ...s, reminders: false }))
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-900">
        <div className="text-blue-200">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="bg-slate-800/60 border border-blue-500/20 rounded-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold text-white mb-2">Smart Ledger</h1>
          <p className="text-blue-200 mb-6">Please sign in to view your dashboard.</p>
          <button
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
              if (error) showToast(error.message, 'error')
            }}
            className="w-full px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white"
          >
            Continue with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]"></div>

      <div className="relative min-h-screen p-6 md:p-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Smart Ledger</h1>
            <div className="flex items-center gap-3">
              <span className="text-blue-200 text-sm">{user.email}</span>
              <button
                onClick={async () => { await supabase.auth.signOut() }}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-blue-100 text-sm"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Bank Balance" onSave={saveBank} saving={!!saving.bank}>
              <NumberInput label="Amount" placeholder="Enter your bank balance…" value={bankAmount} onChange={setBankAmount} />
            </Section>

            <Section title="Expenses" onSave={saveExpense} saving={!!saving.expenses}>
              <div className="grid grid-cols-2 gap-3">
                <NumberInput label="Amount" placeholder="Enter total expenses…" value={expenseAmount} onChange={setExpenseAmount} />
                <TextInput label="Month" placeholder="e.g. Jan 2025" value={expenseMonth} onChange={setExpenseMonth} />
              </div>
            </Section>

            <Section title="Sales" onSave={saveSales} saving={!!saving.sales}>
              <NumberInput label="Amount" placeholder="Enter total sales…" value={salesAmount} onChange={setSalesAmount} />
            </Section>

            <Section title="Orders" onSave={saveOrders} saving={!!saving.orders}>
              <div className="grid grid-cols-3 gap-3">
                <NumberInput label="Total" placeholder="0" value={ordersTotal} onChange={setOrdersTotal} />
                <NumberInput label="Pending" placeholder="0" value={ordersPending} onChange={setOrdersPending} />
                <NumberInput label="Completed" placeholder="0" value={ordersCompleted} onChange={setOrdersCompleted} />
              </div>
            </Section>

            <Section title="Reminders" onSave={saveReminder} saving={!!saving.reminders}>
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Title" placeholder="Enter a reminder…" value={reminderTitle} onChange={setReminderTitle} />
                <DateInput label="Due date" placeholder="" value={reminderDate} onChange={setReminderDate} />
              </div>
            </Section>
          </div>
        </div>
      </div>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  )
}

export default App
