import './i18n/config';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { installGlobalErrorHandlers } from './utils/errorReporting'

installGlobalErrorHandlers()
import { Provider } from 'react-redux'
import { store } from './store'
import { ToastProvider } from './contexts/ToastContext'
import { SocketProvider } from './contexts/SocketContext'
import { UserProvider } from './contexts/UserContext'
import { QuantumHUDProvider } from './contexts/QuantumHUDContext'
import { HiddenBetsProvider } from './contexts/HiddenBetsContext'
import { MusicProvider } from './contexts/MusicContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ToastProvider>
        <UserProvider>
          <SocketProvider>
            <QuantumHUDProvider>
              <HiddenBetsProvider>
                <MusicProvider>
                  <App />
                </MusicProvider>
              </HiddenBetsProvider>
            </QuantumHUDProvider>
          </SocketProvider>
        </UserProvider>
      </ToastProvider>
    </Provider>
  </React.StrictMode>,
)