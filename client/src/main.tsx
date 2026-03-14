import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import { ToastProvider } from './contexts/ToastContext'
import { SocketProvider } from './contexts/SocketContext'
import { QuantumHUDProvider } from './contexts/QuantumHUDContext'
import { HiddenBetsProvider } from './contexts/HiddenBetsContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ToastProvider>
        <SocketProvider>
          <QuantumHUDProvider>
            <HiddenBetsProvider>
              <App />
            </HiddenBetsProvider>
          </QuantumHUDProvider>
        </SocketProvider>
      </ToastProvider>
    </Provider>
  </React.StrictMode>,
)