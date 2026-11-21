import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegistrationWizardPage } from './pages/RegistrationWizardPage'
import { StudentDetailPage } from './pages/StudentDetailPage'
import { StudentsListPage } from './pages/StudentsListPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/cadastro" element={<RegistrationWizardPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/alunos"
        element={
          <ProtectedRoute>
            <StudentsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alunos/:id"
        element={
          <ProtectedRoute>
            <StudentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
