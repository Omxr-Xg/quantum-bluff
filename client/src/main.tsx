import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import { SocketProvider } from './contexts/SocketContext'  // ← AJOUTER CETTE LIGNE
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <SocketProvider>  {/* ← AJOUTER CETTE LIGNE */}
        <App />
      </SocketProvider>  {/* ← AJOUTER CETTE LIGNE */}
    </Provider>
  </React.StrictMode>,
)