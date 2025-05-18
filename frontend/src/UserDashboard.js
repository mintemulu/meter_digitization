"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Activity,
  Zap,
  DollarSign,
  AlertTriangle,
  Clock,
  TrendingUp,
  Calendar,
  RefreshCw,
  Download,
} from "lucide-react"
import "./UserDashboard.css"

function UserDashboard() {
  // State management
  const [readings, setReadings] = useState([])
  const [historicalData, setHistoricalData] = useState({})
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [timeRange, setTimeRange] = useState("week")
  const [activeTab, setActiveTab] = useState("overview")

  // Constants
  const backendApiUrl = "http://localhost:4000/api"
  const token = localStorage.getItem("jwtToken")
  const user = JSON.parse(localStorage.getItem("user"))

  // Fetch dashboard readings on component mount
  useEffect(() => {
    fetchDashboardReadings()
  }, [token])

  // Fetch historical data when device or time range changes
  useEffect(() => {
    if (selectedDevice) {
      fetchHistoricalData(selectedDevice)
    }
  }, [selectedDevice, timeRange])

  // Fetch latest readings from API
  const fetchDashboardReadings = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await axios.get(`${backendApiUrl}/dashboard/readings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setReadings(response.data)

      // Set the first device as selected if available
      if (response.data.length > 0 && user?.assignedDevices?.length > 0) {
        setSelectedDevice(user.assignedDevices[0])
      }

      setLoading(false)
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch readings.")
      setLoading(false)
    }
  }

  // Fetch historical data for a specific device
  const fetchHistoricalData = async (deviceIp) => {
    setLoading(true)
    try {
      const response = await axios.get(`${backendApiUrl}/dashboard/monthly/${deviceIp}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setHistoricalData((prev) => ({
        ...prev,
        [deviceIp]: response.data,
      }))

      setLoading(false)
    } catch (error) {
      setError(`Failed to fetch historical data for ${deviceIp}`)
      setLoading(false)
    }
  }

  // Filter readings by device IP
  const getReadingsByIP = (ip) => {
    return readings.filter((reading) => reading.device_ip === ip)
  }

  // Get the latest reading for a device
  const getLatestReadingByIP = (ip) => {
    const deviceReadings = getReadingsByIP(ip)
    if (deviceReadings.length === 0) return null

    return deviceReadings.reduce((latest, current) => {
      return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
    })
  }

// Calculate billing based on readings
const calculateBilling = (readings) => {
  if (!readings || readings.length === 0) return { totalConsumption: 0, totalBill: 0 }

  // Calculate consumption as the sum of (value - pre) for each reading
  const totalConsumption = readings.reduce((sum, r) => {
    // If pre exists, calculate value - pre, otherwise use value
    const consumption = r.pre !== undefined ? 
      parseFloat(r.value || 0) - parseFloat(r.pre || 0) : 
      parseFloat(r.value || 0);
    
    // Only add positive consumption values (to handle potential errors)
    return sum + (consumption > 0 ? consumption : 0);
  }, 0);

  // Ethiopian electricity tier rates
  const tiers = [
    { limit: 50, rate: 0.27 },
    { limit: 100, rate: 0.77 },
    { limit: 200, rate: 1.63 },
    { limit: 300, rate: 2.0 },
    { limit: 400, rate: 2.2 },
    { limit: 500, rate: 2.41 },
    { limit: Number.POSITIVE_INFINITY, rate: 2.48 },
  ]

  let remaining = totalConsumption
  let totalBill = 0

  for (const tier of tiers) {
    const units = Math.min(tier.limit, remaining)
    totalBill += units * tier.rate
    remaining -= units
    if (remaining <= 0) break
  }

  return { totalConsumption, totalBill }
}
  // Calculate billing breakdown by tier
  const calculateBillingBreakdown = (totalConsumption) => {
    const tiers = [
      { name: "Tier 1 (0-50)", limit: 50, rate: 0.27 },
      { name: "Tier 2 (51-100)", limit: 50, rate: 0.77 },
      { name: "Tier 3 (101-200)", limit: 100, rate: 1.63 },
      { name: "Tier 4 (201-300)", limit: 100, rate: 2.0 },
      { name: "Tier 5 (301-400)", limit: 100, rate: 2.2 },
      { name: "Tier 6 (401-500)", limit: 100, rate: 2.41 },
      { name: "Tier 7 (>500)", limit: Number.POSITIVE_INFINITY, rate: 2.48 },
    ]

    let remaining = totalConsumption
    const breakdown = []

    for (const tier of tiers) {
      if (remaining <= 0) break

      const consumed = Math.min(tier.limit, remaining)
      const cost = consumed * tier.rate

      if (consumed > 0) {
        breakdown.push({
          name: tier.name,
          consumed,
          rate: tier.rate,
          cost,
        })
      }

      remaining -= consumed
    }

    return breakdown
  }

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })
  }

  // Format date for charts
  const formatChartDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-KE", { month: "short", day: "numeric" })
  }

  // Export readings to CSV
  const exportToCSV = (deviceIp) => {
    const deviceReadings = getReadingsByIP(deviceIp)
    if (!deviceReadings || deviceReadings.length === 0) return

    const csvContent = [
      ["Value", "Raw", "Previous", "Timestamp", "Device IP", "Rate"],
      ...deviceReadings.map((reading) => [
        reading.value,
        reading.raw,
        reading.pre,
        formatDate(reading.timestamp),
        reading.device_ip,
        reading.rate,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `meter-readings-${deviceIp}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setSuccess("Readings exported successfully")
    setTimeout(() => setSuccess(""), 3000)
  }

  // Prepare chart data
  const getChartData = (deviceIp) => {
    const deviceData = historicalData[deviceIp]
    if (!deviceData || !deviceData.readings) return []

    return deviceData.readings.map((reading) => ({
      date: formatChartDate(reading.timestamp),
      value: reading.value,
      raw: reading.raw,
      pre: reading.pre,
      timestamp: reading.timestamp,
    }))
  }

  // Get consumption trend (increasing, decreasing, stable)
  const getConsumptionTrend = (deviceIp) => {
    const deviceData = historicalData[deviceIp]
    if (!deviceData || !deviceData.readings || deviceData.readings.length < 2) return "stable"

    const sortedReadings = [...deviceData.readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

    const firstHalf = sortedReadings.slice(0, Math.floor(sortedReadings.length / 2))
    const secondHalf = sortedReadings.slice(Math.floor(sortedReadings.length / 2))

    const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.value, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.value, 0) / secondHalf.length

    const percentChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100

    if (percentChange > 10) return "increasing"
    if (percentChange < -10) return "decreasing"
    return "stable"
  }

  // Get color based on trend
  const getTrendColor = (trend) => {
    if (trend === "increasing") return "#ef4444"
    if (trend === "decreasing") return "#22c55e"
    return "#f59e0b"
  }

  // Get icon based on trend
  const getTrendIcon = (trend) => {
    if (trend === "increasing") return <TrendingUp size={16} className="trend-icon increasing" />
    if (trend === "decreasing") return <TrendingUp size={16} className="trend-icon decreasing" />
    return <Activity size={16} className="trend-icon stable" />
  }

  // COLORS for charts
  const COLORS = ["#0284c7", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Smart Energy Meter Dashboard</h1>
          <p>Monitor your energy consumption and billing</p>
        </div>
        <div className="dashboard-actions">
          <button className="refresh-button" onClick={fetchDashboardReadings}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {user?.assignedDevices?.length > 0 ? (
        <>
          <div className="device-selector">
            <label>Select Meter:</label>
            <select value={selectedDevice || ""} onChange={(e) => setSelectedDevice(e.target.value)} disabled={loading}>
              <option value="" disabled>
                Select a meter
              </option>
              {user.assignedDevices.map((ip) => (
                <option key={ip} value={ip}>
                  {ip}
                </option>
              ))}
            </select>
          </div>

          {selectedDevice && (
            <>
              <div className="dashboard-tabs">
                <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>
                  <Activity size={18} />
                  Overview
                </button>
                <button
                  className={activeTab === "consumption" ? "active" : ""}
                  onClick={() => setActiveTab("consumption")}
                >
                  <Zap size={18} />
                  Consumption
                </button>
                <button className={activeTab === "billing" ? "active" : ""} onClick={() => setActiveTab("billing")}>
                  <DollarSign size={18} />
                  Billing
                </button>
                <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>
                  <Calendar size={18} />
                  History
                </button>
              </div>

              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="dashboard-content">
                  <div className="stats-grid">
                    {loading ? (
                      Array(4)
                        .fill()
                        .map((_, i) => (
                          <div className="stat-card skeleton" key={i}>
                            <div className="skeleton-circle"></div>
                            <div className="skeleton-content">
                              <div className="skeleton-line"></div>
                              <div className="skeleton-line"></div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <>
                        <div className="stat-card">
                          <div className="stat-icon">
                            <Zap size={24} />
                          </div>
                          <div className="stat-content">
                            <h3>Current Reading</h3>
                            <div className="stat-value">
                              {getLatestReadingByIP(selectedDevice)?.value.toFixed(2) || "0.00"} kWh
                            </div>
                            <p className="stat-description">
                              Last updated:{" "}
                              {getLatestReadingByIP(selectedDevice)
                                ? formatDate(getLatestReadingByIP(selectedDevice).timestamp)
                                : "N/A"}
                            </p>
                          </div>
                        </div>

                        <div className="stat-card">
                          <div className="stat-icon">
                            <Activity size={24} />
                          </div>
                          <div className="stat-content">
                            <h3>Consumption</h3>
                            <div className="stat-value">
                              {calculateBilling(getReadingsByIP(selectedDevice)).totalConsumption.toFixed(2)} kWh
                            </div>
                            <p className="stat-description">
                              {getTrendIcon(getConsumptionTrend(selectedDevice))}
                              {getConsumptionTrend(selectedDevice) === "increasing"
                                ? "Increasing"
                                : getConsumptionTrend(selectedDevice) === "decreasing"
                                  ? "Decreasing"
                                  : "Stable"}
                            </p>
                          </div>
                        </div>

                        <div className="stat-card">
                          <div className="stat-icon">
                            <DollarSign size={24} />
                          </div>
                          <div className="stat-content">
                            <h3>Current Bill</h3>
                            <div className="stat-value">
                              ETB {calculateBilling(getReadingsByIP(selectedDevice)).totalBill.toFixed(2)}
                            </div>
                            <p className="stat-description">Based on current consumption</p>
                          </div>
                        </div>

                        <div className="stat-card">
                          <div className="stat-icon">
                            <Clock size={24} />
                          </div>
                          <div className="stat-content">
                            <h3>Reading Count</h3>
                            <div className="stat-value">{getReadingsByIP(selectedDevice).length}</div>
                            <p className="stat-description">Total readings collected</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3>Consumption Trend</h3>
                      <div className="time-range-selector">
                        <button className={timeRange === "week" ? "active" : ""} onClick={() => setTimeRange("week")}>
                          Week
                        </button>
                        <button className={timeRange === "month" ? "active" : ""} onClick={() => setTimeRange("month")}>
                          Month
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      {loading ? (
                        <div className="chart-skeleton">
                          <div className="skeleton-line"></div>
                          <div className="skeleton-chart"></div>
                        </div>
                      ) : (
                        <div className="chart-container">
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={getChartData(selectedDevice)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Area
                                type="monotone"
                                dataKey="value"
                                name="Energy (kWh)"
                                stroke="#0284c7"
                                fill="#0284c7"
                                fillOpacity={0.2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3>Latest Readings</h3>
                      <button
                        className="export-button"
                        onClick={() => exportToCSV(selectedDevice)}
                        disabled={getReadingsByIP(selectedDevice).length === 0}
                      >
                        <Download size={16} />
                        Export
                      </button>
                    </div>
                    <div className="card-body">
                      {loading ? (
                        <div className="table-skeleton">
                          {Array(5)
                            .fill()
                            .map((_, i) => (
                              <div className="skeleton-row" key={i}></div>
                            ))}
                        </div>
                      ) : getReadingsByIP(selectedDevice).length > 0 ? (
                        <div className="table-container">
                          <table className="reading-table">
                            <thead>
                              <tr>
                                <th>Value (kWh)</th>
                                <th>Raw</th>
                                <th>Previous</th>
                                <th>Timestamp</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getReadingsByIP(selectedDevice)
                                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                .slice(0, 5)
                                .map((reading) => (
                                  <tr key={reading._id}>
                                    <td>{reading.value.toFixed(2)}</td>
                                    <td>{reading.raw}</td>
                                    <td>{reading.pre}</td>
                                    <td>{formatDate(reading.timestamp)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="no-data">No readings available for this meter.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Consumption Tab */}
              {activeTab === "consumption" && (
                <div className="dashboard-content">
                  <div className="card">
                    <div className="card-header">
                      <h3>Energy Consumption</h3>
                      <div className="time-range-selector">
                        <button className={timeRange === "week" ? "active" : ""} onClick={() => setTimeRange("week")}>
                          Week
                        </button>
                        <button className={timeRange === "month" ? "active" : ""} onClick={() => setTimeRange("month")}>
                          Month
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      {loading ? (
                        <div className="chart-skeleton">
                          <div className="skeleton-line"></div>
                          <div className="skeleton-chart"></div>
                        </div>
                      ) : (
                        <>
                          <div className="consumption-summary">
                            <div className="summary-item">
                              <h4>Total Consumption</h4>
                              <div className="summary-value">
                                {calculateBilling(getReadingsByIP(selectedDevice)).totalConsumption.toFixed(2)} kWh
                              </div>
                            </div>
                            <div className="summary-item">
                              <h4>Average Daily</h4>
                              <div className="summary-value">
                                {(
                                  calculateBilling(getReadingsByIP(selectedDevice)).totalConsumption /
                                  (timeRange === "week" ? 7 : 30)
                                ).toFixed(2)}{" "}
                                kWh
                              </div>
                            </div>
                            <div className="summary-item">
                              <h4>Consumption Trend</h4>
                              <div className="summary-value trend">
                                {getTrendIcon(getConsumptionTrend(selectedDevice))}
                                {getConsumptionTrend(selectedDevice) === "increasing"
                                  ? "Increasing"
                                  : getConsumptionTrend(selectedDevice) === "decreasing"
                                    ? "Decreasing"
                                    : "Stable"}
                              </div>
                            </div>
                          </div>

                          <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={getChartData(selectedDevice)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" name="Energy (kWh)" fill="#0284c7" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="consumption-details">
                            <h4>Consumption Details</h4>
                            <div className="details-grid">
                              <div className="detail-item">
                                <span className="detail-label">Latest Reading:</span>
                                <span className="detail-value">
                                  {getLatestReadingByIP(selectedDevice)?.value.toFixed(2) || "0.00"} kWh
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Raw Value:</span>
                                <span className="detail-value">
                                  {getLatestReadingByIP(selectedDevice)?.raw || "N/A"}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Previous Reading:</span>
                                <span className="detail-value">
                                  {getLatestReadingByIP(selectedDevice)?.pre || "N/A"}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Rate:</span>
                                <span className="detail-value">
                                  {getLatestReadingByIP(selectedDevice)?.rate || "N/A"} ETB/kWh
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3>Raw vs Processed Values</h3>
                    </div>
                    <div className="card-body">
                      {loading ? (
                        <div className="chart-skeleton">
                          <div className="skeleton-line"></div>
                          <div className="skeleton-chart"></div>
                        </div>
                      ) : (
                        <div className="chart-container">
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={getChartData(selectedDevice)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="raw" name="Raw Value" stroke="#f59e0b" strokeWidth={2} />
                              <Line
                                type="monotone"
                                dataKey="pre"
                                name="Previous Value"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                name="Processed Value (kWh)"
                                stroke="#0284c7"
                                strokeWidth={2}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      <div className="ai-processing-info">
                        <h4>AI Processing Information</h4>
                        <p>
                          Our AI system processes the raw meter readings captured by the ESP32-CAM. The raw value is the
                          direct OCR reading from the meter image, while the processed value is the calculated
                          consumption based on the current and previous readings.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Tab */}
              {activeTab === "billing" && (
                <div className="dashboard-content">
                  <div className="card">
                    <div className="card-header">
                      <h3>Billing Summary</h3>
                    </div>
                    <div className="card-body">
                      {loading ? (
                        <div className="billing-skeleton">
                          <div className="skeleton-line"></div>
                          <div className="skeleton-circle large"></div>
                          <div className="skeleton-line"></div>
                        </div>
                      ) : (
                        <>
                          <div className="billing-summary">
                            <div className="billing-total">
                              <h4>Total Bill</h4>
                              <div className="total-amount">
                                ETB {calculateBilling(getReadingsByIP(selectedDevice)).totalBill.toFixed(2)}
                              </div>
                              <p>
                                Based on {calculateBilling(getReadingsByIP(selectedDevice)).totalConsumption.toFixed(2)}{" "}
                                kWh consumption
                              </p>
                            </div>

                            <div className="billing-chart">
                              <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                  <Pie
                                    data={calculateBillingBreakdown(
                                      calculateBilling(getReadingsByIP(selectedDevice)).totalConsumption,
                                    )}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="cost"
                                  >
                                    {calculateBillingBreakdown(
                                      calculateBilling(getReadingsByIP(selectedDevice)).totalConsumption,
                                    ).map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value) => `ETB ${value.toFixed(2)}`} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="billing-breakdown">
                            <h4>Billing Breakdown by Tier</h4>
                            <table className="breakdown-table">
                              <thead>
                                <tr>
                                  <th>Tier</th>
                                  <th>Consumption (kWh)</th>
                                  <th>Rate (ETB/kWh)</th>
                                  <th>Cost (ETB)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {calculateBillingBreakdown(
                                  calculateBilling(getReadingsByIP(selectedDevice)).totalConsumption,
                                ).map((tier, index) => (
                                  <tr key={index}>
                                    <td>{tier.name}</td>
                                    <td>{tier.consumed.toFixed(2)}</td>
                                    <td>{tier.rate.toFixed(2)}</td>
                                    <td>{tier.cost.toFixed(2)}</td>
                                  </tr>
                                ))}
                                <tr className="total-row">
                                  <td colSpan="3">Total</td>
                                  <td>{calculateBilling(getReadingsByIP(selectedDevice)).totalBill.toFixed(2)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="billing-info">
                            <h4>Ethiopian Electricity Tariff Structure</h4>
                            <p>
                              The Ethiopian Electric Utility uses a tiered pricing structure where the rate increases
                              with higher consumption. This encourages energy conservation and efficient use of
                              electricity.
                            </p>
                            <table className="tariff-table">
                              <thead>
                                <tr>
                                  <th>Consumption Range (kWh)</th>
                                  <th>Rate (ETB/kWh)</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>0-50</td>
                                  <td>0.27</td>
                                </tr>
                                <tr>
                                  <td>51-100</td>
                                  <td>0.77</td>
                                </tr>
                                <tr>
                                  <td>101-200</td>
                                  <td>1.63</td>
                                </tr>
                                <tr>
                                  <td>201-300</td>
                                  <td>2.00</td>
                                </tr>
                                <tr>
                                  <td>301-400</td>
                                  <td>2.20</td>
                                </tr>
                                <tr>
                                  <td>401-500</td>
                                  <td>2.41</td>
                                </tr>
                                <tr>
                                  <td>Above 500</td>
                                  <td>2.48</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* History Tab */}
              {activeTab === "history" && (
                <div className="dashboard-content">
                  <div className="card">
                    <div className="card-header">
                      <h3>Reading History</h3>
                      <button
                        className="export-button"
                        onClick={() => exportToCSV(selectedDevice)}
                        disabled={getReadingsByIP(selectedDevice).length === 0}
                      >
                        <Download size={16} />
                        Export All
                      </button>
                    </div>
                    <div className="card-body">
                      {loading ? (
                        <div className="table-skeleton">
                          {Array(10)
                            .fill()
                            .map((_, i) => (
                              <div className="skeleton-row" key={i}></div>
                            ))}
                        </div>
                      ) : getReadingsByIP(selectedDevice).length > 0 ? (
                        <div className="table-container">
                          <table className="reading-table">
                            <thead>
                              <tr>
                                <th>Value (kWh)</th>
                                <th>Raw</th>
                                <th>Previous</th>
                                <th>Rate</th>
                                <th>Error</th>
                                <th>Timestamp</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getReadingsByIP(selectedDevice)
                                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                .map((reading) => (
                                  <tr key={reading._id}>
                                    <td>{reading.value.toFixed(2)}</td>
                                    <td>{reading.raw}</td>
                                    <td>{reading.pre}</td>
                                    <td>{reading.rate}</td>
                                    <td>
                                      {reading.error ? (
                                        <span className="error-badge">
                                          <AlertTriangle size={14} />
                                          {reading.error}
                                        </span>
                                      ) : (
                                        <span className="success-badge">None</span>
                                      )}
                                    </td>
                                    <td>{formatDate(reading.timestamp)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="no-data">No readings available for this meter.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="no-devices">
          <AlertTriangle size={48} />
          <h3>No Meters Associated</h3>
          <p>No meter IPs are associated with your account. Please contact your administrator.</p>
        </div>
      )}
    </div>
  )
}

export default UserDashboard
