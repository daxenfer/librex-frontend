import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contextos/AuthContexto'
import { ProtectedRoute } from './componentes/RutaProtegida'
import { Layout } from './componentes/Layout'
import { LoginPage } from './paginas/LoginPagina'
import { ProductsPage } from './paginas/ProductosPagina'
import { CustomersPage } from './paginas/ClientesPagina'
import { PublishersPage } from './paginas/EditorialesPagina'
import { RemissionsPage } from './paginas/RemisionesPagina'
import { RemissionForm } from './paginas/RemisionFormulario'
import { ReturnsPage } from './paginas/DevolucionesPagina'
import { ReturnNoteForm } from './paginas/DevolucionFormulario'
import { PaymentsPage } from './paginas/PagosPagina'
import { PaymentForm } from './paginas/PagoFormulario'
import { ReportsPage } from './paginas/ReportesPagina'
import { SettingsPage } from './paginas/AjustesPagina'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/publishers" element={<PublishersPage />} />
              <Route path="/remissions" element={<RemissionsPage />} />
              <Route path="/remissions/new" element={<RemissionForm />} />
              <Route path="/remissions/:id/edit" element={<RemissionForm />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/returns/new" element={<ReturnNoteForm />} />
              <Route path="/returns/:id/edit" element={<ReturnNoteForm />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/payments/new" element={<PaymentForm />} />
              <Route path="/payments/:id/edit" element={<PaymentForm />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
