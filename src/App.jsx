import { useEffect, useState } from 'react'

function uuid() {
  // Simple UUID v4 generator for client_id
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function useClientId() {
  const [clientId, setClientId] = useState(null)
  useEffect(() => {
    let id = localStorage.getItem('smart-ledger-client-id')
    if (!id) {
      id = uuid()
      localStorage.setItem('smart-ledger-client-id', id)
    }
    setClientId(id)
  }, [])
  return clientId
}

const BASE_URL = import.meta.env.VITE_BACKEND_URL || ''

async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`POST ${path} failed: ${res.status} ${txt}`)
  }
  return res.json()
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
    <div className={`fixed bottom-6 right-6 ${color} text-white px-4 py-2 rounded-lg shadow-lg`} onClick={onClose}>
      {message}
    </div>
  )
}

function App() {
  const clientId = useClientId()
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const [loading, setLoading] = useState(true)
  const [bankAmount, setBankAmount] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseMonth, setExpenseMonth] = useState('')
  const [salesAmount, setSalesAmount] = useState('')
  const [ordersTotal, setOrdersTotal] = useState('')
  const [ordersPending, setOrdersPending] = useState('')
  const [ordersCompleted, setOrdersCompleted] = useState('')
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderDate, setReminderDate] = useState('')

  const [saving, setSaving] = useState({})

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type }), 2000)
  }

  // Initial load
  useEffect(() => {
    if (!clientId) return
    const load = async () => {
      try {
        setLoading(true)
        const data = await apiGet(`/api/dashboard/${clientId}`)
        const bank = data.bank_balance
        if (bank) setBankAmount(bank.amount ?? '')

        const exp = data.expenses
        if (exp) {
          setExpenseAmount(exp.amount ?? '')
          setExpenseMonth(exp.month ?? '')
        }

        const sale = data.sales
        if (sale) setSalesAmount(sale.amount ?? '')

        const ord = data.orders
        if (ord) {
          setOrdersTotal(ord.total_orders ?? '')
          setOrdersPending(ord.pending ?? '')
          setOrdersCompleted(ord.completed ?? '')
        }

        const rem = data.reminders
        if (rem) {
          setReminderTitle(rem.title ?? '')
          setReminderDate(rem.due_date ? String(rem.due_date).substring(0, 10) : '')
        }
      } catch (e) {
        showToast(e.message || 'Error loading data', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clientId])

  const upsert = async (table, values) => {
    if (!clientId) return
    await apiPost(`/api/upsert/${table}`, { client_id: clientId, values })
  }

  const saveBank = async () => {
    try {
      setSaving((s) => ({ ...s, bank: true }))
      await upsert('bank_balance', { amount: bankAmount === '' ? null : Number(bankAmount) })
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
      await upsert('expenses', {
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
      await upsert('sales', { amount: salesAmount === '' ? null : Number(salesAmount) })
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
      await upsert('orders', {
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
      await upsert('reminders', {
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

  if (loading || !clientId) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-900">
        <div className="text-blue-200">Loading...</div>
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
            <div className="flex items-center gap-3 text-blue-200 text-sm">
              <span>Client ID:</span>
              <code className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-blue-100">
                {clientId?.slice(0, 8)}…
              </code>
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
