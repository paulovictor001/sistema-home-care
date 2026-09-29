from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Category
from accounts.permissions import GroupNames

User = get_user_model()

GROUP_TO_CATEGORY = {
    GroupNames.GERENTE: "Gerente",
    GroupNames.MEDICO: "Médico",
    GroupNames.ENFERMEIRO: "Enfermeiro",
}


def make_cpf_user(cpf="52998224725", password="Senha123!", group=GroupNames.GERENTE):
    category = Category.objects.get(name=GROUP_TO_CATEGORY[group])
    user = User.objects.create_user(
        cpf=cpf,
        password=password,
        email=f"user-{cpf}@teste.local",
        category=category,
    )
    user.groups.add(Group.objects.get(name=group))
    return user, password


class AuthCookieFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_login_sets_httponly_cookies_and_no_token_in_body(self):
        user, password = make_cpf_user()
        response = self.client.post(
            "/api/auth/login/",
            {"cpf": "529.982.247-25", "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["user"]["cpf"], user.cpf)
        self.assertNotIn("access", body)
        self.assertNotIn("refresh", body)
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)
        morsel = response.cookies["access_token"]
        self.assertTrue(morsel["httponly"])

    def test_login_invalid_credentials_returns_401_without_cookies(self):
        make_cpf_user()
        response = self.client.post(
            "/api/auth/login/",
            {"cpf": "52998224725", "password": "errada"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("access_token", response.cookies)

    def test_me_requires_cookie(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 401)

    def test_me_refresh_logout_flow(self):
        _, password = make_cpf_user()
        self.client.post(
            "/api/auth/login/",
            {"cpf": "52998224725", "password": password},
            format="json",
        )
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)

        refresh = self.client.post("/api/auth/refresh/")
        self.assertEqual(refresh.status_code, 200)

        logout = self.client.post("/api/auth/logout/")
        self.assertEqual(logout.status_code, 200)
        me_after = self.client.get("/api/auth/me/")
        self.assertEqual(me_after.status_code, 401)


class MedicoListTests(TestCase):
    """GET /api/medicos/ — suporte ao select de medico responsavel."""

    def _client_as(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_gerente_lists_only_active_medicos_ordered(self):
        medico_b, _ = make_cpf_user(
            cpf="12345678909", password="Senha123!", group=GroupNames.MEDICO
        )
        medico_b.first_name = "Bruno"
        medico_b.save()
        medico_a, _ = make_cpf_user(
            cpf="11144477735", password="Senha123!", group=GroupNames.MEDICO
        )
        medico_a.first_name = "Ana"
        medico_a.save()
        inativo, _ = make_cpf_user(
            cpf="98765432100", password="Senha123!", group=GroupNames.MEDICO
        )
        inativo.is_active = False
        inativo.save()
        gerente, _ = make_cpf_user(
            cpf="52998224725", password="Senha123!", group=GroupNames.GERENTE
        )

        response = self._client_as(gerente).get("/api/medicos/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["id"] for item in response.json()],
            [medico_a.id, medico_b.id],
        )
        self.assertEqual(
            set(response.json()[0].keys()),
            {"id", "first_name", "last_name", "cpf"},
        )

    def test_non_manager_gets_403(self):
        medico, _ = make_cpf_user(
            cpf="11144477735", password="Senha123!", group=GroupNames.MEDICO
        )
        response = self._client_as(medico).get("/api/medicos/")
        self.assertEqual(response.status_code, 403)

    def test_anonymous_gets_401(self):
        response = APIClient().get("/api/medicos/")
        self.assertEqual(response.status_code, 401)
