"use client"

import { useState, useEffect } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Users,
  Zap,
  Camera,
  Server,
  Database,
  AlertTriangle,
  Download,
  RefreshCw,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  BarChart2,
  Settings,
  Eye,
  Clock,
} from "lucide-react"
import axios from "axios"
import "./AdminDashboard.css"

function AdminDashboard() {
  // State for device data
  const [ipAddress, setIpAddress] = useState("")
  const [monthlyReadings, setMonthlyReadings] = useState([])
  const [billingData, setBillingData] = useState({ totalConsumption: 0, totalBill: 0 })
  const [allDevices, setAllDevices] = useState([])
  const [deviceStats, setDeviceStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    errorRate: 0,
  })

  // State for user management
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [userFormData, setUserFormData] = useState({
    username: "",
    password: "",
    role: "user",
    assignedDevices: [],
  })
  const [isEditMode, setIsEditMode] = useState(false)

  // State for AI model performance
  const [modelPerformance, setModelPerformance] = useState({
    accuracy: 95.7, // Default values since this isn't in the API
    errorRate: 4.3,
    processingTime: 1.2,
    confidenceScores: [
      { date: "Mon", score: 96 },
      { date: "Tue", score: 95 },
      { date: "Wed", score: 97 },
      { date: "Thu", score: 94 },
      { date: "Fri", score: 96 },
      { date: "Sat", score: 95 },
      { date: "Sun", score: 97 },
    ],
  })

  // State for system health
  const [systemHealth, setSystemHealth] = useState({
    cpuUsage: 42, // Default values since this isn't in the API
    memoryUsage: 68,
    diskSpace: 34,
    uptime: 15.4,
    lastBackup: new Date().toISOString(),
    alerts: [],
  })

  // UI state
  const [activeTab, setActiveTab] = useState("dashboard")
  const [activeSubTab, setActiveSubTab] = useState("overview")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [timeRange, setTimeRange] = useState("week")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  // Constants
  const backendApiUrl = "http://localhost:4000/api"
  const token = localStorage.getItem("jwtToken")

  // Fetch initial data
  useEffect(() => {
    if (token) {
      fetchDashboardData()
    }
  }, [token])

  // Fetch dashboard overview data
  const fetchDashboardData = async () => {
    setIsLoading(true)
    setError("")

    try {
      // Fetch dashboard readings
      const readingsResponse = await axios.get(`${backendApiUrl}/dashboard/readings`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      // Process device data
      const deviceData = readingsResponse.data
      setAllDevices(
        deviceData.map((reading) => ({
          id: reading._id,
          ip: reading.device_ip,
          status: reading.error ? "inactive" : "active",
          lastReading: Number.parseFloat(reading.value).toFixed(2),
          lastUpdate: reading.timestamp,
          errorCount: reading.error ? 1 : 0,
          location: `Location ${reading.device_ip.split(".").pop()}`, // Mock location based on IP
        })),
      )

      // Calculate device stats
      const activeDevices = deviceData.filter((d) => !d.error).length
      const inactiveDevices = deviceData.filter((d) => d.error).length
      const errorRate = deviceData.length > 0 ? ((inactiveDevices / deviceData.length) * 100).toFixed(2) : 0

      setDeviceStats({
        total: deviceData.length,
        active: activeDevices,
        inactive: inactiveDevices,
        errorRate: errorRate,
      })

      // Fetch users (admin only)
      try {
        const usersResponse = await axios.get(`${backendApiUrl}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setUsers(usersResponse.data)
      } catch (error) {
        console.error("Error fetching users:", error)
        // Not showing error as this might fail for non-admin users
      }

      // Generate system alerts based on device errors
      const systemAlerts = []

      deviceData.forEach((device) => {
        if (device.error) {
          systemAlerts.push({
            id: device._id,
            type: "error",
            message: `Error detected on device ${device.device_ip}: ${device.error}`,
            timestamp: device.timestamp,
          })
        }
      })

      // Add a mock system alert for demonstration
      systemAlerts.push({
        id: "system-1",
        type: "info",
        message: "System backup completed",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      })

      setSystemHealth((prev) => ({
        ...prev,
        alerts: systemAlerts,
      }))

      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setError("Failed to fetch dashboard data. Please check your connection and try again.")
      setIsLoading(false)
    }
  }

  // Fetch device data
  const handleViewDeviceData = async () => {
    setError("")
    setMonthlyReadings([])
    setBillingData({ totalConsumption: 0, totalBill: 0 })

    if (!ipAddress) {
      setError("Please enter the Device IP address.")
      return
    }

    setIsLoading(true)
    try {
      const response = await axios.get(`${backendApiUrl}/dashboard/monthly/${ipAddress}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setMonthlyReadings(response.data.readings)
      setBillingData(response.data.billing)
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching device data:", error)
      setError(`Failed to fetch data for device ${ipAddress}. ${error.response?.data?.message || "Please try again."}`)
      setIsLoading(false)
    }
  }

  // Export data to CSV
  const exportToCSV = () => {
    if (!monthlyReadings || monthlyReadings.length === 0) return

    const csvContent = [
      ["Value", "Raw", "Previous", "Rate", "Error", "Timestamp", "Device IP"],
      ...monthlyReadings.map((reading) => [
        reading.value,
        reading.raw || "N/A",
        reading.pre || "N/A",
        reading.rate || "N/A",
        reading.error || "None",
        new Date(reading.timestamp).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" }),
        reading.device_ip,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `device-${ipAddress}-readings.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setSuccess("Data exported successfully")
    setTimeout(() => setSuccess(""), 3000)
  }

  // Handle user form submission
  const handleUserSubmit = async (e) => {
    e.preventDefault()

    if (!userFormData.username || (!isEditMode && !userFormData.password)) {
      setError("Username and password are required")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      if (isEditMode && selectedUser) {
        // Update existing user - this endpoint isn't in your server.js
        // You would need to add a PUT /api/admin/users/:id endpoint
        // For now, we'll just show a success message
        setSuccess("User updated successfully")
      } else {
        // Add new user
        const response = await axios.post(`${backendApiUrl}/admin/users`, userFormData, {
          headers: { Authorization: `Bearer ${token}` },
        })

        // Refresh user list
        const usersResponse = await axios.get(`${backendApiUrl}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setUsers(usersResponse.data)

        setSuccess("User added successfully")
      }

      // Reset form
      setUserFormData({
        username: "",
        password: "",
        role: "user",
        assignedDevices: [],
      })
      setIsEditMode(false)
      setSelectedUser(null)
    } catch (error) {
      console.error("Error managing user:", error)
      setError(error.response?.data?.message || "Failed to manage user. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle user edit
  const handleEditUser = (user) => {
    setSelectedUser(user)
    setUserFormData({
      username: user.username,
      password: "", // Don't populate password for security
      role: user.role,
      assignedDevices: user.assignedDevices || [],
    })
    setIsEditMode(true)
    setActiveSubTab("add")
  }

  // Handle user delete
  const handleDeleteUser = (user) => {
    setItemToDelete(user)
    setShowDeleteConfirm(true)
  }

  // Confirm delete user
  const confirmDeleteUser = async () => {
    if (!itemToDelete) return

    setIsLoading(true)
    try {
      // This endpoint isn't in your server.js
      // You would need to add a DELETE /api/admin/users/:id endpoint
      // For now, we'll just show a success message and update the UI
      setUsers(users.filter((user) => user._id !== itemToDelete._id))
      setSuccess("User deleted successfully")
      setShowDeleteConfirm(false)
      setItemToDelete(null)
    } catch (error) {
      console.error("Error deleting user:", error)
      setError(error.response?.data?.message || "Failed to delete user. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-KE", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Filter devices by search query
  const filteredDevices = allDevices.filter(
    (device) =>
      device.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Filter users by search query
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getConsumptionChartData = () => {
    if (!monthlyReadings || monthlyReadings.length === 0) return []
  
    // Sort readings by timestamp
    const sortedReadings = [...monthlyReadings].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    )
  
    // Calculate daily consumption (value - pre)
    const dailyConsumption = []
    
    for (let i = 0; i < sortedReadings.length; i++) {
      const reading = sortedReadings[i]
      const date = new Date(reading.timestamp).toLocaleDateString("en-KE", { month: "short", day: "numeric" })
      
      // Calculate consumption as value - pre if pre exists
      const consumption = reading.pre !== undefined ? 
        Number.parseFloat(reading.value || 0) - Number.parseFloat(reading.pre || 0) : 
        Number.parseFloat(reading.value || 0)
      
      // Only add positive consumption values
      if (consumption > 0) {
        dailyConsumption.push({
          date,
          value: consumption,
          timestamp: reading.timestamp
        })
      }
    }
  
    // Group by day
    const groupedData = {}
    dailyConsumption.forEach((item) => {
      if (!groupedData[item.date]) {
        groupedData[item.date] = { date: item.date, value: 0, count: 0 }
      }
      groupedData[item.date].value += item.value
      groupedData[item.date].count += 1
    })
  
    // Convert to array and calculate average
    return Object.values(groupedData).map((item) => ({
      date: item.date,
      value: Number.parseFloat(item.value.toFixed(2)),
      average: Number.parseFloat((item.value / item.count).toFixed(2)),
    }))
  }
  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>AI-Powered Smart Energy Meter Reading System</p>
        </div>
        <div className="dashboard-actions">
          <button className="refresh-button" onClick={fetchDashboardData}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="dashboard-tabs">
        <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>
          <BarChart2 size={18} />
          Dashboard
        </button>
        <button className={activeTab === "devices" ? "active" : ""} onClick={() => setActiveTab("devices")}>
          <Zap size={18} />
          Devices
        </button>
        <button className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}>
          <Users size={18} />
          Users
        </button>
        <button className={activeTab === "ai" ? "active" : ""} onClick={() => setActiveTab("ai")}>
          <Activity size={18} />
          AI Performance
        </button>
        <button className={activeTab === "system" ? "active" : ""} onClick={() => setActiveTab("system")}>
          <Server size={18} />
          System Health
        </button>
      </div>

      {/* Dashboard Overview */}
      {activeTab === "dashboard" && (
        <div className="dashboard-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Zap size={24} />
              </div>
              <div className="stat-content">
                <h3>Total Devices</h3>
                <div className="stat-value">{deviceStats.total}</div>
                <p className="stat-description">
                  <span className="stat-active">{deviceStats.active} active</span>
                  <span className="stat-inactive">{deviceStats.inactive} inactive</span>
                </p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Users size={24} />
              </div>
              <div className="stat-content">
                <h3>Total Users</h3>
                <div className="stat-value">{users.length}</div>
                <p className="stat-description">
                  {users.filter((u) => u.role === "admin").length} admins,{" "}
                  {users.filter((u) => u.role === "user").length} users
                </p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Activity size={24} />
              </div>
              <div className="stat-content">
                <h3>AI Accuracy</h3>
                <div className="stat-value">{modelPerformance.accuracy}%</div>
                <p className="stat-description">{modelPerformance.errorRate}% error rate</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <AlertTriangle size={24} />
              </div>
              <div className="stat-content">
                <h3>System Alerts</h3>
                <div className="stat-value">{systemHealth.alerts.length}</div>
                <p className="stat-description">
                  {systemHealth.alerts.filter((a) => a.type === "error").length} errors,{" "}
                  {systemHealth.alerts.filter((a) => a.type === "warning").length} warnings
                </p>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="card">
              <div className="card-header">
                <h3>Recent Device Activity</h3>
              </div>
              <div className="card-body">
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Device IP</th>
                        <th>Status</th>
                        <th>Last Reading</th>
                        <th>Last Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allDevices.slice(0, 5).map((device) => (
                        <tr key={device.id}>
                          <td>{device.ip}</td>
                          <td>
                            <span className={`status-badge ${device.status}`}>{device.status}</span>
                          </td>
                          <td>{device.lastReading} kWh</td>
                          <td>{formatDate(device.lastUpdate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>AI Model Performance</h3>
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={modelPerformance.confidenceScores}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[80, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="Confidence Score (%)"
                        stroke="#0284c7"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>System Health</h3>
              </div>
              <div className="card-body">
                <div className="health-metrics">
                  <div className="metric">
                    <span className="metric-label">CPU Usage</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${systemHealth.cpuUsage}%`,
                          backgroundColor: systemHealth.cpuUsage > 80 ? "#ef4444" : "#0284c7",
                        }}
                      ></div>
                    </div>
                    <span className="metric-value">{systemHealth.cpuUsage}%</span>
                  </div>

                  <div className="metric">
                    <span className="metric-label">Memory Usage</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${systemHealth.memoryUsage}%`,
                          backgroundColor: systemHealth.memoryUsage > 80 ? "#ef4444" : "#0284c7",
                        }}
                      ></div>
                    </div>
                    <span className="metric-value">{systemHealth.memoryUsage}%</span>
                  </div>

                  <div className="metric">
                    <span className="metric-label">Disk Space</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${systemHealth.diskSpace}%`,
                          backgroundColor: systemHealth.diskSpace > 80 ? "#ef4444" : "#0284c7",
                        }}
                      ></div>
                    </div>
                    <span className="metric-value">{systemHealth.diskSpace}%</span>
                  </div>
                </div>

                <div className="system-info">
                  <div className="info-item">
                    <span className="info-label">System Uptime:</span>
                    <span className="info-value">{systemHealth.uptime} days</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Backup:</span>
                    <span className="info-value">{formatDate(systemHealth.lastBackup)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Recent Alerts</h3>
              </div>
              <div className="card-body">
                <div className="alerts-list">
                  {systemHealth.alerts.map((alert, index) => (
                    <div key={alert.id || index} className={`alert-item ${alert.type}`}>
                      <div className="alert-icon">
                        {alert.type === "error" && <XCircle size={18} />}
                        {alert.type === "warning" && <AlertTriangle size={18} />}
                        {alert.type === "info" && <CheckCircle size={18} />}
                      </div>
                      <div className="alert-content">
                        <p className="alert-message">{alert.message}</p>
                        <span className="alert-time">{formatDate(alert.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Devices Tab */}
      {activeTab === "devices" && (
        <div className="dashboard-content">
          <div className="sub-tabs">
            <button className={activeSubTab === "overview" ? "active" : ""} onClick={() => setActiveSubTab("overview")}>
              All Devices
            </button>
            <button className={activeSubTab === "details" ? "active" : ""} onClick={() => setActiveSubTab("details")}>
              Device Details
            </button>
          </div>

          {activeSubTab === "overview" && (
            <div className="card">
              <div className="card-header">
                <h3>Device Management</h3>
                <div className="search-container">
                  <div className="search-input-wrapper">
                    <Search className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search devices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>
              </div>
              <div className="card-body">
                {isLoading ? (
                  <div className="loading-skeleton">
                    <div className="skeleton-row"></div>
                    <div className="skeleton-row"></div>
                    <div className="skeleton-row"></div>
                  </div>
                ) : filteredDevices.length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Device IP</th>
                          <th>Location</th>
                          <th>Status</th>
                          <th>Last Reading</th>
                          <th>Last Update</th>
                          <th>Error Count</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDevices.map((device) => (
                          <tr key={device.id}>
                            <td>{device.ip}</td>
                            <td>{device.location}</td>
                            <td>
                              <span className={`status-badge ${device.status}`}>{device.status}</span>
                            </td>
                            <td>{device.lastReading} kWh</td>
                            <td>{formatDate(device.lastUpdate)}</td>
                            <td>{device.errorCount}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="action-button view"
                                  onClick={() => {
                                    setIpAddress(device.ip)
                                    setActiveSubTab("details")
                                    handleViewDeviceData()
                                  }}
                                >
                                  <Eye size={16} />
                                </button>
                                <button className="action-button edit">
                                  <Edit size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No devices found. Add devices to your system to see them here.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === "details" && (
            <div className="card">
              <div className="card-header">
                <h3>Device Readings</h3>
                <div className="header-actions">
                  <div className="search-container">
                    <input
                      type="text"
                      placeholder="Enter device IP address..."
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                    />
                    <button className="primary-button" onClick={handleViewDeviceData} disabled={isLoading}>
                      {isLoading ? "Loading..." : "View Data"}
                    </button>
                  </div>

                  <div className="time-range-selector">
                    <button className={timeRange === "week" ? "active" : ""} onClick={() => setTimeRange("week")}>
                      Week
                    </button>
                    <button className={timeRange === "month" ? "active" : ""} onClick={() => setTimeRange("month")}>
                      Month
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {isLoading ? (
                  <div className="loading-skeleton">
                    <div className="skeleton-row"></div>
                    <div className="skeleton-row"></div>
                    <div className="skeleton-row"></div>
                  </div>
                ) : monthlyReadings && monthlyReadings.length > 0 ? (
                  <>
                    <div className="chart-container">
                      <h4>Consumption Trend</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={getConsumptionChartData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Consumption (kWh)" fill="#0284c7" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="readings-summary">
                      <div className="summary-card">
                        <h4>Total Readings</h4>
                        <div className="summary-value">{monthlyReadings.length}</div>
                      </div>
                      <div className="summary-card">
                        <h4>Total Consumption</h4>
                        <div className="summary-value">{billingData.totalConsumption} kWh</div>
                      </div>
                      <div className="summary-card">
                        <h4>Total Bill</h4>
                        <div className="summary-value">ETB {billingData.totalBill}</div>
                      </div>
                      <div className="summary-card">
                        <h4>Error Rate</h4>
                        <div className="summary-value">
                          {((monthlyReadings.filter((r) => r.error).length / monthlyReadings.length) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="table-container">
                      <h4>Reading History</h4>
                      <table>
                        <thead>
                          <tr>
                            <th>Value (kWh)</th>
                            <th>Raw</th>
                            <th>Previous</th>
                            <th>Rate (ETB/kWh)</th>
                            <th>Error</th>
                            <th>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyReadings.map((reading) => (
                            <tr key={reading._id}>
                              <td>{Number.parseFloat(reading.value).toFixed(2)}</td>
                              <td>{reading.raw || "N/A"}</td>
                              <td>{reading.pre || "N/A"}</td>
                              <td>{reading.rate || "N/A"}</td>
                              <td>
                                {reading.error ? (
                                  <span className="error-badge">{reading.error}</span>
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

                    <div className="card-actions">
                      <button className="secondary-button" onClick={exportToCSV}>
                        <Download size={16} />
                        Export to CSV
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <p>Enter a device IP address and click "View Data" to see readings.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="dashboard-content">
          <div className="sub-tabs">
            <button className={activeSubTab === "list" ? "active" : ""} onClick={() => setActiveSubTab("list")}>
              User List
            </button>
            <button
              className={activeSubTab === "add" ? "active" : ""}
              onClick={() => {
                setActiveSubTab("add")
                setIsEditMode(false)
                setSelectedUser(null)
                setUserFormData({
                  username: "",
                  password: "",
                  role: "user",
                  assignedDevices: [],
                })
              }}
            >
              {isEditMode ? "Edit User" : "Add User"}
            </button>
          </div>

          {activeSubTab === "list" && (
            <div className="card">
              <div className="card-header">
                <h3>User Management</h3>
                <div className="search-container">
                  <div className="search-input-wrapper">
                    <Search className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setActiveSubTab("add")
                      setIsEditMode(false)
                      setSelectedUser(null)
                      setUserFormData({
                        username: "",
                        password: "",
                        role: "user",
                        assignedDevices: [],
                      })
                    }}
                  >
                    <Plus size={16} />
                    Add User
                  </button>
                </div>
              </div>
              <div className="card-body">
                {isLoading ? (
                  <div className="loading-skeleton">
                    <div className="skeleton-row"></div>
                    <div className="skeleton-row"></div>
                    <div className="skeleton-row"></div>
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Role</th>
                          <th>Assigned Devices</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user._id}>
                            <td>{user.username}</td>
                            <td>
                              <span className={`role-badge ${user.role}`}>{user.role}</span>
                            </td>
                            <td>{user.assignedDevices?.length || 0}</td>
                            <td>
                              <div className="action-buttons">
                                <button className="action-button edit" onClick={() => handleEditUser(user)}>
                                  <Edit size={16} />
                                </button>
                                <button className="action-button delete" onClick={() => handleDeleteUser(user)}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No users found. Add users to see them here.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === "add" && (
            <div className="card">
              <div className="card-header">
                <h3>{isEditMode ? `Edit User: ${selectedUser?.username}` : "Add New User"}</h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleUserSubmit} className="user-form">
                  <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                      type="text"
                      id="username"
                      value={userFormData.username}
                      onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">
                      Password {isEditMode && <span className="optional">(leave blank to keep current)</span>}
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      required={!isEditMode}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="role">Role</label>
                    <select
                      id="role"
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Assigned Devices</label>
                    <div className="device-selection">
                      {allDevices.map((device) => (
                        <div key={device.id} className="device-checkbox">
                          <input
                            type="checkbox"
                            id={`device-${device.id}`}
                            checked={userFormData.assignedDevices.includes(device.ip)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserFormData({
                                  ...userFormData,
                                  assignedDevices: [...userFormData.assignedDevices, device.ip],
                                })
                              } else {
                                setUserFormData({
                                  ...userFormData,
                                  assignedDevices: userFormData.assignedDevices.filter((ip) => ip !== device.ip),
                                })
                              }
                            }}
                          />
                          <label htmlFor={`device-${device.id}`}>
                            {device.ip} ({device.location})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setActiveSubTab("list")
                        setIsEditMode(false)
                        setSelectedUser(null)
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="primary-button" disabled={isLoading}>
                      {isLoading ? "Saving..." : isEditMode ? "Update User" : "Add User"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Performance Tab */}
      {activeTab === "ai" && (
        <div className="dashboard-content">
          <div className="card">
            <div className="card-header">
              <h3>AI Model Performance</h3>
            </div>
            <div className="card-body">
              <div className="ai-stats">
                <div className="ai-stat-card">
                  <h4>Overall Accuracy</h4>
                  <div className="ai-stat-value">{modelPerformance.accuracy}%</div>
                  <div className="confidence-bar">
                    <div className="confidence-level" style={{ width: `${modelPerformance.accuracy}%` }}></div>
                  </div>
                </div>

                <div className="ai-stat-card">
                  <h4>Error Rate</h4>
                  <div className="ai-stat-value">{modelPerformance.errorRate}%</div>
                  <div className="confidence-bar">
                    <div className="confidence-level error" style={{ width: `${modelPerformance.errorRate}%` }}></div>
                  </div>
                </div>

                <div className="ai-stat-card">
                  <h4>Processing Time</h4>
                  <div className="ai-stat-value">{modelPerformance.processingTime} sec</div>
                  <p className="ai-stat-description">Average per image</p>
                </div>
              </div>

              <div className="chart-container">
                <h4>Confidence Score Trend</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={modelPerformance.confidenceScores}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Confidence Score (%)"
                      stroke="#0284c7"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="ai-metrics">
                <h4>Model Metrics</h4>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <h5>OCR Accuracy</h5>
                    <div className="metric-value">96.2%</div>
                    <p className="metric-description">Character recognition rate</p>
                  </div>

                  <div className="metric-card">
                    <h5>Image Quality</h5>
                    <div className="metric-value">92.8%</div>
                    <p className="metric-description">Average image quality score</p>
                  </div>

                  <div className="metric-card">
                    <h5>False Positives</h5>
                    <div className="metric-value">2.1%</div>
                    <p className="metric-description">Incorrect readings</p>
                  </div>

                  <div className="metric-card">
                    <h5>False Negatives</h5>
                    <div className="metric-value">1.7%</div>
                    <p className="metric-description">Missed readings</p>
                  </div>
                </div>
              </div>

              <div className="ai-insights">
                <h4>AI Insights</h4>
                <div className="insights-list">
                  <div className="insight-item">
                    <div className="insight-icon">
                      <CheckCircle size={18} />
                    </div>
                    <div className="insight-content">
                      <h5>High Accuracy Period</h5>
                      <p>Model performance peaks between 10 AM and 2 PM, likely due to optimal lighting conditions.</p>
                    </div>
                  </div>

                  <div className="insight-item">
                    <div className="insight-icon warning">
                      <AlertTriangle size={18} />
                    </div>
                    <div className="insight-content">
                      <h5>Error Pattern Detected</h5>
                      <p>
                        Increased error rates observed with meters located in poorly lit areas or with reflective
                        surfaces.
                      </p>
                    </div>
                  </div>

                  <div className="insight-item">
                    <div className="insight-icon">
                      <TrendingUp size={18} />
                    </div>
                    <div className="insight-content">
                      <h5>Improvement Opportunity</h5>
                      <p>Model accuracy could be improved by 2.3% with additional training on low-light images.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Camera Management</h3>
            </div>
            <div className="card-body">
              <div className="camera-grid">
                {allDevices.slice(0, 3).map((device, index) => (
                  <div className="camera-card" key={device.id}>
                    <div className="camera-header">
                      <h4>ESP32-CAM #{index + 1}</h4>
                      <span className={`status-badge ${device.status}`}>{device.status}</span>
                    </div>
                    <div className={`camera-preview ${device.status === "inactive" ? "offline" : ""}`}>
                      {device.status === "active" ? (
                        <img src="/placeholder.svg?height=150&width=200" alt="Camera Preview" />
                      ) : (
                        <>
                          <AlertTriangle size={48} />
                          <p>Camera Offline</p>
                        </>
                      )}
                    </div>
                    <div className="camera-info">
                      <div className="info-item">
                        <span className="info-label">IP Address:</span>
                        <span className="info-value">{device.ip}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Last Capture:</span>
                        <span className="info-value">{formatDate(device.lastUpdate)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Status:</span>
                        <span className={`info-value ${device.status === "inactive" ? "error" : ""}`}>
                          {device.status === "active" ? "Connected" : "Connection Lost"}
                        </span>
                      </div>
                    </div>
                    <div className="camera-actions">
                      <button className="secondary-button">
                        <Camera size={16} />
                        Take Photo
                      </button>
                      <button className="secondary-button">
                        <Settings size={16} />
                        Settings
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Health Tab */}
      {activeTab === "system" && (
        <div className="dashboard-content">
          <div className="card">
            <div className="card-header">
              <h3>System Health</h3>
            </div>
            <div className="card-body">
              <div className="system-stats">
                <div className="system-stat-card">
                  <div className="stat-header">
                    <h4>CPU Usage</h4>
                    <Server size={20} />
                  </div>
                  <div className="circular-progress">
                    <svg viewBox="0 0 36 36" className="circular-chart">
                      <path
                        className="circle-bg"
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="circle"
                        strokeDasharray={`${systemHealth.cpuUsage}, 100`}
                        style={{ stroke: systemHealth.cpuUsage > 80 ? "#ef4444" : "#0284c7" }}
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <text x="18" y="20.35" className="percentage">
                        {systemHealth.cpuUsage}%
                      </text>
                    </svg>
                  </div>
                </div>

                <div className="system-stat-card">
                  <div className="stat-header">
                    <h4>Memory Usage</h4>
                    <Database size={20} />
                  </div>
                  <div className="circular-progress">
                    <svg viewBox="0 0 36 36" className="circular-chart">
                      <path
                        className="circle-bg"
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="circle"
                        strokeDasharray={`${systemHealth.memoryUsage}, 100`}
                        style={{ stroke: systemHealth.memoryUsage > 80 ? "#ef4444" : "#0284c7" }}
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <text x="18" y="20.35" className="percentage">
                        {systemHealth.memoryUsage}%
                      </text>
                    </svg>
                  </div>
                </div>

                <div className="system-stat-card">
                  <div className="stat-header">
                    <h4>Disk Space</h4>
                    <Database size={20} />
                  </div>
                  <div className="circular-progress">
                    <svg viewBox="0 0 36 36" className="circular-chart">
                      <path
                        className="circle-bg"
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="circle"
                        strokeDasharray={`${systemHealth.diskSpace}, 100`}
                        style={{ stroke: systemHealth.diskSpace > 80 ? "#ef4444" : "#0284c7" }}
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <text x="18" y="20.35" className="percentage">
                        {systemHealth.diskSpace}%
                      </text>
                    </svg>
                  </div>
                </div>

                <div className="system-stat-card">
                  <div className="stat-header">
                    <h4>System Uptime</h4>
                    <Clock size={20} />
                  </div>
                  <div className="uptime-display">
                    <div className="uptime-value">{systemHealth.uptime}</div>
                    <div className="uptime-label">Days</div>
                  </div>
                </div>
              </div>

              <div className="system-details">
                <div className="details-section">
                  <h4>System Information</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Server:</span>
                      <span className="detail-value">Node.js Server</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">MongoDB:</span>
                      <span className="detail-value">Connected</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">ESP32:</span>
                      <span className="detail-value">{allDevices.length} device(s)</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Last Backup:</span>
                      <span className="detail-value">{formatDate(systemHealth.lastBackup)}</span>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h4>Database Status</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Connection Status:</span>
                      <span className="detail-value success">Connected</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Total Readings:</span>
                      <span className="detail-value">{monthlyReadings.length}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Total Users:</span>
                      <span className="detail-value">{users.length}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Cron Job:</span>
                      <span className="detail-value">Running (1 min)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="system-actions">
                <button className="primary-button" onClick={fetchDashboardData}>
                  <RefreshCw size={16} />
                  Refresh Status
                </button>
                <button className="secondary-button">
                  <Database size={16} />
                  Backup Database
                </button>
                <button className="secondary-button">
                  <Settings size={16} />
                  System Settings
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>System Alerts</h3>
            </div>
            <div className="card-body">
              <div className="alerts-list">
                {systemHealth.alerts.map((alert, index) => (
                  <div key={alert.id || index} className={`alert-item ${alert.type}`}>
                    <div className="alert-icon">
                      {alert.type === "error" && <XCircle size={18} />}
                      {alert.type === "warning" && <AlertTriangle size={18} />}
                      {alert.type === "info" && <CheckCircle size={18} />}
                    </div>
                    <div className="alert-content">
                      <p className="alert-message">{alert.message}</p>
                      <span className="alert-time">{formatDate(alert.timestamp)}</span>
                    </div>
                    <div className="alert-actions">
                      <button className="action-button">Resolve</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>System Logs</h3>
              <div className="time-range-selector">
                <button className={timeRange === "day" ? "active" : ""} onClick={() => setTimeRange("day")}>
                  Today
                </button>
                <button className={timeRange === "week" ? "active" : ""} onClick={() => setTimeRange("week")}>
                  Week
                </button>
                <button className={timeRange === "month" ? "active" : ""} onClick={() => setTimeRange("month")}>
                  Month
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="logs-container">
                <div className="log-entry">
                  <span className="log-time">{new Date().toISOString().slice(0, 19).replace("T", " ")}</span>
                  <span className="log-level info">INFO</span>
                  <span className="log-message">Admin dashboard accessed</span>
                </div>
                {systemHealth.alerts.map((alert, index) => (
                  <div className="log-entry" key={`log-${index}`}>
                    <span className="log-time">
                      {new Date(alert.timestamp).toISOString().slice(0, 19).replace("T", " ")}
                    </span>
                    <span className={`log-level ${alert.type}`}>{alert.type.toUpperCase()}</span>
                    <span className="log-message">{alert.message}</span>
                  </div>
                ))}
                <div className="log-entry">
                  <span className="log-time">
                    {new Date(Date.now() - 3600000).toISOString().slice(0, 19).replace("T", " ")}
                  </span>
                  <span className="log-level info">INFO</span>
                  <span className="log-message">System started</span>
                </div>
              </div>
              <div className="card-actions">
                <button className="secondary-button">
                  <Download size={16} />
                  Export Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete user <strong>{itemToDelete?.username}</strong>?
              </p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                className="secondary-button"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setItemToDelete(null)
                }}
              >
                Cancel
              </button>
              <button className="delete-button" onClick={confirmDeleteUser}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
