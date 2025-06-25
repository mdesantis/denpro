import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import MuiHelloWorld from '~/demos/mui_hello_world'
import MuiDashboard from '~/demos/mui_dashboard/Dashboard'

const muiHelloWorld = document.getElementById('mui-hello-world')
if (muiHelloWorld) {
  const root = createRoot(muiHelloWorld)
  root.render(<StrictMode><MuiHelloWorld></MuiHelloWorld></StrictMode>)
}

const muiDashboard = document.getElementById('mui-dashboard')
if (muiDashboard) {
  const root = createRoot(muiDashboard)
  root.render(<StrictMode><MuiDashboard></MuiDashboard></StrictMode>)
}
