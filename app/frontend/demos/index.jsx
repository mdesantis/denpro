import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import MuiHelloWorld from '~/demos/mui_hello_world'

const muiHelloWorld = document.getElementById('mui-hello-world')
if (muiHelloWorld) {
  const root = createRoot(muiHelloWorld)
  root.render(<StrictMode><MuiHelloWorld></MuiHelloWorld></StrictMode>)
}
