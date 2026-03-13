'use client'

import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import type { ChartData } from '@/lib/store'

interface ChartCardProps {
  chart: ChartData
  index: number
  fullWidth?: boolean
}

const COLORS = ['#00d4ff', '#0ea5e9', '#06b6d4', '#22d3ee', '#67e8f9']

export function ChartCard({ chart, index, fullWidth = false }: ChartCardProps) {
  const [showData, setShowData] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(chart.data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div 
      className={`
        glass-card rounded-xl p-6 animate-fade-up
        ${fullWidth ? 'col-span-1 md:col-span-2' : ''}
      `}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{chart.title}</h3>
          <p className="text-sm text-muted-foreground italic">{chart.reason}</p>
        </div>
        <button
          onClick={handleCopy}
          className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Copy chart data as JSON"
        >
          {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Chart */}
      <div className="h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(chart)}
        </ResponsiveContainer>
      </div>

      {/* Data table toggle */}
      <button
        onClick={() => setShowData(!showData)}
        className="
          flex items-center gap-2 mt-4 text-sm text-muted-foreground
          hover:text-foreground transition-colors
        "
      >
        {showData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showData ? 'Hide raw data' : 'Show raw data'}
      </button>

      {/* Data table */}
      {showData && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {Object.keys(chart.data[0] || {}).map((key) => (
                  <th key={key} className="text-left py-2 px-3 font-mono text-muted-foreground">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.data.map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Object.values(row).map((value, j) => (
                    <td key={j} className="py-2 px-3 font-mono text-foreground">
                      {String(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function renderChart(chart: ChartData) {
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-mono">{entry.value.toLocaleString()}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  switch (chart.type) {
    case 'bar':
    case 'histogram':
      // Determine data keys for grouped bar chart
      const barKeys = Object.keys(chart.data[0] || {}).filter(
        (key) => key !== chart.x && typeof chart.data[0][key] === 'number'
      )
      return (
        <BarChart data={chart.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey={chart.x} 
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#1e3a5f' }}
          />
          <YAxis 
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#1e3a5f' }}
          />
          <Tooltip content={<CustomTooltip />} />
          {chart.type === 'bar' ? <Legend wrapperStyle={{ paddingTop: '10px' }} /> : null}
          {barKeys.map((key, index) => (
            <Bar 
              key={key} 
              dataKey={key} 
              fill={COLORS[index % COLORS.length]} 
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      )

    case 'line':
      const lineKey = Object.keys(chart.data[0] || {}).find(
        (key) => key !== chart.x && typeof chart.data[0][key] === 'number'
      ) || chart.y
      return (
        <LineChart data={chart.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey={chart.x} 
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#1e3a5f' }}
          />
          <YAxis 
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#1e3a5f' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Line 
            type="monotone" 
            dataKey={lineKey} 
            stroke="#00d4ff" 
            strokeWidth={2}
            dot={{ fill: '#00d4ff', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#00d4ff' }}
          />
        </LineChart>
      )

    case 'scatter':
      return (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey={chart.x} 
            name={chart.x}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#1e3a5f' }}
          />
          <YAxis 
            dataKey={chart.y} 
            name={chart.y}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#1e3a5f' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Scatter 
            name="Data Points" 
            data={chart.data} 
            fill="#00d4ff"
          />
        </ScatterChart>
      )

    case 'pie':
      return (
        <PieChart>
          <Pie
            data={chart.data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }: { name: string; percent: number }) => 
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chart.data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.fill as string || COLORS[index % COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-medium text-foreground">{data.name}</p>
                    <p className="text-sm text-primary font-mono">{data.value.toLocaleString()}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
        </PieChart>
      )

    default:
      return <div className="flex items-center justify-center h-full text-muted-foreground">Unsupported chart type</div>
  }
}
