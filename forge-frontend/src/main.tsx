import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import './index.css'

import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProjectPage from './pages/ProjectPage'
import ASTPage from './pages/ASTPage'
import { ProcessingPage } from './pages/ProcessingPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/project" replace />} />
            <Route path="/project" element={<ProjectPage />} />
            <Route path="/ast" element={<ASTPage />} />
          </Route>

          {/* Processing — standalone, no app layout */}
          <Route path="/processing" element={<ProcessingPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'hsl(222, 47%, 8%)',
            color: 'hsl(213, 31%, 91%)',
            border: '1px solid hsl(216, 34%, 15%)',
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
)
