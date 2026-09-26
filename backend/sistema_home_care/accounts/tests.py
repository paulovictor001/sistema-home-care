from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.permissions import GroupNames

User = get_user_model()


def make_cpf_user(cpf="52998224725", password="Senha123!", group=GroupNames.GERENTE):
    user = User.objects.create_user(cpf=cpf, password=password)
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
