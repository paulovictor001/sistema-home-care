import { Outlet, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { RequireAuth } from "./components/RequireAuth";
import { RequireGerente } from "./components/RequireGerente";
import { AssessmentDetail } from "./pages/AssessmentDetail";
import { AssessmentForm } from "./pages/AssessmentForm";
import { AssessmentsHistory } from "./pages/AssessmentsHistory";
import { Categories } from "./pages/Categories";
import { NeedTypes } from "./pages/NeedTypes";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { PatientDetail } from "./pages/PatientDetail";
import { PatientForm } from "./pages/PatientForm";
import { PatientsList } from "./pages/PatientsList";
import { Professions } from "./pages/Professions";
import { UserDetail } from "./pages/UserDetail";
import { UserForm } from "./pages/UserForm";
import { UsersList } from "./pages/UsersList";
import { CarePlans } from './pages/CarePlans';
import { CarePlanDetail } from './pages/CarePlanDetail';
import { CareScales } from './pages/CareScales';
import { CareScaleDetail } from './pages/CareScaleDetail';

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
          <Route
            path="/pacientes/novo"
            element={<PatientForm mode="create" />}
          />
        </Route>
        <Route path="/pacientes/:id" element={<PatientDetail />} />
        <Route path="/pacientes/:patientId/planos-cuidados" element={<CarePlans />} />
        <Route path="/planos-cuidados/:id" element={<CarePlanDetail />} />
        <Route path="/escalas" element={<CareScales />} />
        <Route path="/pacientes/:patientId/escalas" element={<CareScales />} />
        <Route path="/escalas/:id" element={<CareScaleDetail />} />
        <Route
          path="/pacientes/:id/editar"
          element={<PatientForm mode="edit" />}
        />
        <Route
          path="/pacientes/:patientId/avaliacoes"
          element={<AssessmentsHistory />}
        />
        <Route
          path="/pacientes/:patientId/avaliacoes/nova"
          element={<AssessmentForm mode="create" />}
        />
        <Route path="/avaliacoes/:id" element={<AssessmentDetail />} />
        <Route
          path="/avaliacoes/:id/editar"
          element={<AssessmentForm mode="edit" />}
        />
        <Route element={<GerenteOnly />}>
          <Route path="/usuarios" element={<UsersList />} />
          <Route path="/usuarios/novo" element={<UserForm mode="create" />} />
          <Route path="/usuarios/:id" element={<UserDetail />} />
          <Route path="/tipos" element={<NeedTypes />} />
          <Route
            path="/usuarios/:id/editar"
            element={<UserForm mode="edit" />}
          />
          <Route path="/categorias" element={<Categories />} />
          <Route path="/profissoes" element={<Professions />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
