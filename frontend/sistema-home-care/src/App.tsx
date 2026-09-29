import { Outlet, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { RequireAuth } from "./components/RequireAuth";
import { RequireGerente } from "./components/RequireGerente";
import { Categories } from "./pages/Categories";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { PatientDetail } from "./pages/PatientDetail";
import { PatientForm } from "./pages/PatientForm";
import { PatientsList } from "./pages/PatientsList";
import { Professions } from "./pages/Professions";
import { UserDetail } from "./pages/UserDetail";
import { UserForm } from "./pages/UserForm";
import { UsersList } from "./pages/UsersList";

function ProtectedLayout() {
  return (
    <RequireAuth>
      <AppLayout />
    </RequireAuth>
  );
}

function GerenteOnly() {
  return (
    <RequireGerente>
      <Outlet />
    </RequireGerente>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/pacientes" element={<PatientsList />} />
        <Route element={<GerenteOnly />}>
          <Route path="/pacientes/novo" element={<PatientForm mode="create" />} />
        </Route>
        <Route path="/pacientes/:id" element={<PatientDetail />} />
        <Route path="/pacientes/:id/editar" element={<PatientForm mode="edit" />} />
        <Route element={<GerenteOnly />}>
          <Route path="/usuarios" element={<UsersList />} />
          <Route path="/usuarios/novo" element={<UserForm mode="create" />} />
          <Route path="/usuarios/:id" element={<UserDetail />} />
          <Route path="/usuarios/:id/editar" element={<UserForm mode="edit" />} />
          <Route path="/categorias" element={<Categories />} />
          <Route path="/profissoes" element={<Professions />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
