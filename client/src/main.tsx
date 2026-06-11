import './i18n/preflight'
import './i18n/config'
import { initSentry } from './observability/sentry'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { installGlobalErrorHandlers } from './utils/errorReporting'

initSentry()
installGlobalErrorHandlers()
import { Provider } from 'react-redux'
import { store } from './store'
import { ToastProvider } from './contexts/ToastContext'
import { SocketProvider } from './contexts/SocketContext'
import { UserProvider } from './contexts/UserContext'
import { QuantumHUDProvider } from './contexts/QuantumHUDContext'
import { HiddenBetsProvider } from './contexts/HiddenBetsContext'
import { AudioProvider } from './contexts/MusicContext'

// 1. T'oublies pas les imports !
import { ErrorBoundary } from './components/ErrorBoundary' // Adapte le chemin si besoin
import { LoaderProvider } from './contexts/LoaderContext' // Adapte le chemin si besoin

import App from './App'
import './index.css'
import { scheduleMigrateLegacyAuthOnStartup } from './utils/authStorage'
import { migrateLegacyAdminTokenInPlayerSlot } from './utils/adminAuth'

scheduleMigrateLegacyAuthOnStartup()
migrateLegacyAdminTokenInPlayerSlot()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 2. LE BOUCLIER ANTI-CRASH EN PREMIER */}
    <ErrorBoundary>
      
      {/* 3. L'ÉCRAN DE CHARGEMENT EN DEUXIÈME */}
      <LoaderProvider>
        
        <Provider store={store}>
          <ToastProvider>
            <UserProvider>
              <SocketProvider>
                <QuantumHUDProvider>
                  <HiddenBetsProvider>
                    <AudioProvider>
                      <App />
                    </AudioProvider>
                  </HiddenBetsProvider>
                </QuantumHUDProvider>
              </SocketProvider>
            </UserProvider>
          </ToastProvider>
        </Provider>
        
      </LoaderProvider>
      
    </ErrorBoundary>
  </React.StrictMode>,
)
