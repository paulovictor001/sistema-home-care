import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { RequireGerente } from "./components/RequireGerente";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { PatientDetail } from "./pages/PatientDetail";
import { PatientForm } from "./pages/PatientForm";
import { PatientsList } from "./pages/PatientsList";

function Protected({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

function GerenteOnly({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <RequireGerente>{children}</RequireGerente>
    </RequireAuth>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Home />
          </Protected>
        }
      />
      <Route
        path="/pacientes"
        element={
          <Protected>
            <PatientsList />
          </Protected>
        }
      />
      <Route
        path="/pacientes/novo"
        element={
          <GerenteOnly>
            <PatientForm mode="create" />
          </GerenteOnly>
        }
      />
      <Route
        path="/pacientes/:id"
        element={
          <Protected>
            <PatientDetail />
          </Protected>
        }
      />
      <Route
        path="/pacientes/:id/editar"
        element={
          <Protected>
            <PatientForm mode="edit" />
          </Protected>
        }
      />
    </Routes>
  );
}

export default App;
