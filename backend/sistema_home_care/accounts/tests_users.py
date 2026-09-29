"""Testes do Gerenciamento de Usuarios.

Cobre a validacao da spec (tasks_usuarios.md item 9):
- CPF e e-mail unicos;
- exatamente uma categoria por usuario + correspondencia com a profissao;
- vinculo obrigatorio com profissional (inline ou existente);
- impossibilidade de trocar o profissional;
- exclusao fisica em cascata (gerente) + auditoria preservada;
- sincronizacao de status usuario <-> profissional;
- criacao automatica de categoria (vazia) ao criar profissao;
- atualizacao de categoria apos mudanca de profissao;
- bloqueio de inativacao/exclusao de profissao com vinculos + transferencia;
- permissoes granulares.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient

from professionals.models import Professional

from .models import (
    Category,
    GranularPermission,
    Profession,
    UserAuditAction,
    UserAuditLog,
)

User = get_user_model()

GERENTE_CPF = "52998224725"
MEDICO_CPF = "11144477735"
ENFERMEIRO_CPF = "12345678909"
APOIO_CPF = "98765432100"
NOVO_CPF = "20000000027"
NOVO_CPF_2 = "30000000035"
NOVO_CPF_3 = "40000000043"
NOVO_CPF_4 = "50000000051"
NOVO_CPF_5 = "60000000060"
NOVO_CPF_6 = "70000000078"


def make_categorized_user(cpf, group_name=None, category_name=None, email=None):
    category = Category.objects.get(
        name=category_name or {"GERENTE": "Gerente"}.get(group_name, "Apoio")
    )
    if group_name in ("MEDICO", "ENFERMEIRO"):
        category = Category.objects.get(
            name={"MEDICO": "Médico", "ENFERMEIRO": "Enfermeiro"}[group_name]
        )
    user = User.objects.create_user(
        cpf=cpf,
        password="Senha123!",
        email=email or f"user-{cpf}@teste.local",
        category=category,
    )
    if group_name is not None:
        user.groups.add(Group.objects.get(name=group_name))
    return user


def make_manager_users():
    users = {}
    for cpf, group in (
        (GERENTE_CPF, "GERENTE"),
        (MEDICO_CPF, "MEDICO"),
        (ENFERMEIRO_CPF, "ENFERMEIRO"),
        (APOIO_CPF, None),
    ):
        users[cpf] = make_categorized_user(cpf, group)
    return users


def make_client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


def user_payload(cpf=NOVO_CPF, profession=None, **overrides):
    if profession is None:
        profession = Profession.objects.get(name="Médico")
    payload = {
        "cpf": cpf,
        "password": "SenhaForte123!",
        "email": f"novo-{cpf}@teste.local",
        "first_name": "Novo",
        "last_name": "Usuario",
        "category": Category.objects.get(name=profession.name).pk,
        "professional": {
            "full_name": "Dr. Novo Usuario",
            "profession": profession.pk,
        },
    }
    payload.update(overrides)
    return payload


class UserCreateAPITests(TestCase):
    def setUp(self):
        self.users = make_manager_users()
        self.gerente = make_client(self.users[GERENTE_CPF])
        self.profession = Profession.objects.get(name="Médico")

    def test_gerente_creates_user_with_inline_professional(self):
        response = self.gerente.post(
            "/api/usuarios/", user_payload(), format="json"
        )
        self.assertEqual(response.status_code, 201, response.data)
        user = User.objects.get(cpf=NOVO_CPF)
        self.assertEqual(user.email, f"novo-{NOVO_CPF}@teste.local")
        self.assertEqual(user.category.name, "Médico")
        self.assertEqual(user.professional.full_name, "Dr. Novo Usuario")
        self.assertEqual(user.professional.profession.name, "Médico")
        # Espelho legado: grupo MEDICO sincronizado.
        self.assertTrue(user.groups.filter(name="MEDICO").exists())
        self.assertIn("professional_detail", response.data)

    def test_create_with_existing_free_professional(self):
        pro = Professional.objects.create(
            user=None, full_name="Livre", profession=self.profession
        )
        payload = user_payload()
        payload.pop("professional")
        payload["professional_id"] = pro.pk
        response = self.gerente.post("/api/usuarios/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        pro.refresh_from_db()
        self.assertEqual(pro.user.cpf, NOVO_CPF)

    def test_create_accumulates_all_required_errors(self):
        response = self.gerente.post("/api/usuarios/", {"cpf": NOVO_CPF}, format="json")
        self.assertEqual(response.status_code, 400)
        for field in ("email", "category", "password", "professional"):
            self.assertIn(field, response.data, field)

    def test_duplicate_cpf_even_masked_is_rejected(self):
        self.gerente.post("/api/usuarios/", user_payload(), format="json")
        payload = user_payload(cpf="200.000.000-27")
        payload["email"] = "outro@teste.local"
        response = self.gerente.post("/api/usuarios/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("cpf", response.data)

    def test_duplicate_email_is_rejected(self):
        self.gerente.post("/api/usuarios/", user_payload(), format="json")
        payload = user_payload(cpf=NOVO_CPF_2)
        payload["email"] = f"novo-{NOVO_CPF}@teste.local"
        response = self.gerente.post("/api/usuarios/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_invalid_cpf_is_rejected(self):
        payload = user_payload(cpf="12345678900")
        response = self.gerente.post("/api/usuarios/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("cpf", response.data)

    def test_category_must_match_profession(self):
        payload = user_payload()
        payload["category"] = Category.objects.get(name="Enfermeiro").pk
        response = self.gerente.post("/api/usuarios/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_non_gerente_cannot_create_or_list(self):
        for cpf in (MEDICO_CPF, ENFERMEIRO_CPF, APOIO_CPF):
            client = make_client(self.users[cpf])
            self.assertEqual(
                client.post("/api/usuarios/", user_payload(cpf=NOVO_CPF_3), format="json").status_code,
                403,
                cpf,
            )
            self.assertEqual(client.get("/api/usuarios/").status_code, 403, cpf)

    def test_create_logs_actor_and_action(self):
        self.gerente.post("/api/usuarios/", user_payload(), format="json")
        user = User.objects.get(cpf=NOVO_CPF)
        log = UserAuditLog.objects.get(user=user, action=UserAuditAction.CREATE)
        self.assertEqual(log.actor.cpf, GERENTE_CPF)


class UserListDetailTests(TestCase):
    def setUp(self):
        self.users = make_manager_users()
        self.gerente = make_client(self.users[GERENTE_CPF])

    def _create(self, cpf, full_name="Dr. X", profession_name="Médico"):
        profession = Profession.objects.get(name=profession_name)
        payload = user_payload(cpf=cpf, profession=profession)
        payload["professional"]["full_name"] = full_name
        payload["category"] = Category.objects.get(name=profession_name).pk
        response = self.gerente.post("/api/usuarios/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return User.objects.get(cpf=cpf)

    def test_default_lists_only_active(self):
        user = self._create(NOVO_CPF)
        user.is_active = False
        user.save()
        self._create(NOVO_CPF_2)
        response = self.gerente.get("/api/usuarios/")
        self.assertEqual(response.status_code, 200)
        cpfs = [item["cpf"] for item in response.data["results"]]
        self.assertNotIn(NOVO_CPF, cpfs)
        self.assertIn(NOVO_CPF_2, cpfs)
        inativos = self.gerente.get("/api/usuarios/?status=inativo")
        self.assertIn(NOVO_CPF, [item["cpf"] for item in inativos.data["results"]])

    def test_filters_by_nome_cpf_status_categoria(self):
        self._create(NOVO_CPF, full_name="Ana Beatriz")
        self._create(NOVO_CPF_2, full_name="Carlos Lima", profession_name="Enfermeiro")
        response = self.gerente.get("/api/usuarios/?nome=beatriz")
        self.assertEqual(
            [item["cpf"] for item in response.data["results"]], [NOVO_CPF]
        )
        response = self.gerente.get("/api/usuarios/?cpf=300.000.000-35")
        self.assertEqual(
            [item["cpf"] for item in response.data["results"]], [NOVO_CPF_2]
        )
        response = self.gerente.get("/api/usuarios/?categoria=enfermeiro")
        cpfs = [item["cpf"] for item in response.data["results"]]
        self.assertIn(NOVO_CPF_2, cpfs)
        self.assertNotIn(NOVO_CPF, cpfs)
        response = self.gerente.get("/api/usuarios/?status=todos")
        cpfs = [item["cpf"] for item in response.data["results"]]
        self.assertIn(NOVO_CPF, cpfs)
        self.assertIn(NOVO_CPF_2, cpfs)
        response = self.gerente.get("/api/usuarios/?status=xyz")
        self.assertEqual(response.status_code, 400)

    def test_detail_shows_professional_and_category(self):
        user = self._create(NOVO_CPF)
        response = self.gerente.get(f"/api/usuarios/{user.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["professional_detail"]["full_name"], "Dr. X")
        self.assertEqual(response.data["category_detail"]["name"], "Médico")


class UserUpdateTests(TestCase):
    def setUp(self):
        self.users = make_manager_users()
        self.gerente = make_client(self.users[GERENTE_CPF])
        profession = Profession.objects.get(name="Médico")
        response = self.gerente.post(
            "/api/usuarios/", user_payload(profession=profession), format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.user = User.objects.get(cpf=NOVO_CPF)
        self.url = f"/api/usuarios/{self.user.pk}/"

    def test_gerente_edits_allowed_fields(self):
        response = self.gerente.patch(
            self.url, {"first_name": "Novo Nome", "email": "novo@teste.local"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Novo Nome")

    def test_cannot_swap_professional(self):
        other = Professional.objects.create(
            user=None,
            full_name="Outro",
            profession=Profession.objects.get(name="Médico"),
        )
        response = self.gerente.patch(
            self.url, {"professional_id": other.pk}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("professional", response.data)
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.professional.pk, other.pk)

    def test_cannot_change_category_directly(self):
        enfermeiro = Category.objects.get(name="Enfermeiro").pk
        response = self.gerente.patch(
            self.url, {"category": enfermeiro}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("category", response.data)

    def test_non_gerente_cannot_edit(self):
        client = make_client(self.users[MEDICO_CPF])
        self.assertEqual(
            client.patch(self.url, {"first_name": "X"}, format="json").status_code, 403
        )


class UserStatusActionTests(TestCase):
    def setUp(self):
        self.users = make_manager_users()
        self.gerente = make_client(self.users[GERENTE_CPF])
        profession = Profession.objects.get(name="Médico")
        self.gerente.post(
            "/api/usuarios/", user_payload(profession=profession), format="json"
        )
        self.user = User.objects.get(cpf=NOVO_CPF)

    def test_inactivate_syncs_professional_and_is_idempotent(self):
        url = f"/api/usuarios/{self.user.pk}/inativar/"
        response = self.gerente.post(url)
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertFalse(self.user.professional.is_active)
        # Idempotente.
        self.assertEqual(self.gerente.post(url).status_code, 200)
        default = self.gerente.get("/api/usuarios/")
        self.assertNotIn(
            NOVO_CPF, [item["cpf"] for item in default.data["results"]]
        )
        log = UserAuditLog.objects.filter(user=self.user).latest("created_at")
        self.assertEqual(log.action, UserAuditAction.INACTIVATE)

    def test_reactivate_syncs_professional(self):
        self.gerente.post(f"/api/usuarios/{self.user.pk}/inativar/")
        response = self.gerente.post(f"/api/usuarios/{self.user.pk}/reativar/")
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.assertTrue(self.user.professional.is_active)

    def test_inactive_user_cannot_login(self):
        self.gerente.post(f"/api/usuarios/{self.user.pk}/inativar/")
        response = make_client().post(
            "/api/auth/login/",
            {"cpf": NOVO_CPF, "password": "SenhaForte123!"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("CPF ou senha", str(response.data))

    def test_non_gerente_cannot_change_status(self):
        client = make_client(self.users[MEDICO_CPF])
        self.assertEqual(
            client.post(f"/api/usuarios/{self.user.pk}/inativar/").status_code, 403
        )


class UserDeleteTests(TestCase):
    def setUp(self):
        self.users = make_manager_users()
        self.gerente = make_client(self.users[GERENTE_CPF])
        profession = Profession.objects.get(name="Médico")
        self.gerente.post(
            "/api/usuarios/", user_payload(profession=profession), format="json"
        )
        self.user = User.objects.get(cpf=NOVO_CPF)
        self.pro_pk = self.user.professional.pk

    def test_gerente_deletes_user_and_professional_with_audit(self):
        url = f"/api/usuarios/{self.user.pk}/"
        response = self.gerente.delete(url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        self.assertFalse(Professional.objects.filter(pk=self.pro_pk).exists())
        log = UserAuditLog.objects.get(action=UserAuditAction.DELETE)
        self.assertIsNone(log.user)  # sujeito anulado apos exclusao fisica
        self.assertEqual(log.actor.cpf, GERENTE_CPF)
        self.assertEqual(log.changes["cpf"], NOVO_CPF)

    def test_non_gerente_cannot_delete(self):
        client = make_client(self.users[MEDICO_CPF])
        self.assertEqual(
            client.delete(f"/api/usuarios/{self.user.pk}/").status_code, 403
        )
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())


class ProfessionCategoryTests(TestCase):
    def setUp(self):
        self.users = make_manager_users()
        self.gerente = make_client(self.users[GERENTE_CPF])

    def test_create_profession_auto_creates_empty_category(self):
        response = self.gerente.post(
            "/api/profissoes/", {"name": "Fisioterapeuta"}, format="json"
        )
        self.assertEqual(response.status_code, 201, response.data)
        category = Category.objects.get(name="Fisioterapeuta")
        self.assertEqual(category.permissions.count(), 0)

    def test_inactivate_blocked_with_linked_professionals(self):
        medico = Profession.objects.get(name="Médico")
        Professional.objects.create(
            user=None, full_name="Vinculado", profession=medico
        )
        response = self.gerente.patch(
            f"/api/profissoes/{medico.pk}/", {"is_active": False}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        medico.refresh_from_db()
        self.assertTrue(medico.is_active)

    def test_delete_blocked_with_linked_professionals(self):
        medico = Profession.objects.get(name="Médico")
        Professional.objects.create(
            user=None, full_name="Vinculado", profession=medico
        )
        response = self.gerente.delete(f"/api/profissoes/{medico.pk}/")
        self.assertEqual(response.status_code, 400)
        self.assertTrue(Profession.objects.filter(pk=medico.pk).exists())

    def test_transfer_updates_user_category_and_frees_profession(self):
        response = self.gerente.post(
            "/api/profissoes/", {"name": "Fisioterapeuta"}, format="json"
        )
        fisio = Profession.objects.get(name="Fisioterapeuta")
        self.assertEqual(response.status_code, 201)
        # Usuario medico criado via API.
        payload = user_payload(
            cpf=NOVO_CPF_4, profession=Profession.objects.get(name="Médico")
        )
        payload["category"] = Category.objects.get(name="Médico").pk
        created = self.gerente.post("/api/usuarios/", payload, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        medico = Profession.objects.get(name="Médico")
        # Transferencia em lote.
        response = self.gerente.post(
            f"/api/profissoes/{medico.pk}/transferir/",
            {"to_profession_id": fisio.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        user = User.objects.get(cpf=NOVO_CPF_4)
        self.assertEqual(user.category.name, "Fisioterapeuta")
        self.assertEqual(user.professional.profession.name, "Fisioterapeuta")
        # Medico livre de vinculos: agora pode inativar/excluir.
        self.assertEqual(
            self.gerente.patch(
                f"/api/profissoes/{medico.pk}/", {"is_active": False}, format="json"
            ).status_code,
            200,
        )
        # Auditoria da mudanca de categoria.
        self.assertTrue(
            UserAuditLog.objects.filter(
                user=user, action=UserAuditAction.CATEGORY_CHANGE
            ).exists()
        )

    def test_category_without_users_and_permissions(self):
        # Categoria pode existir sem usuarios e sem permissoes.
        self.gerente.post(
            "/api/profissoes/", {"name": "Terapeuta"}, format="json"
        )
        category = Category.objects.get(name="Terapeuta")
        self.assertEqual(category.users.count(), 0)
        self.assertEqual(category.permissions.count(), 0)
        # Usuario dessa categoria nao acessa operacoes protegidas.
        payload = user_payload(
            cpf=NOVO_CPF_5, profession=Profession.objects.get(name="Terapeuta")
        )
        payload["category"] = category.pk
        created = self.gerente.post("/api/usuarios/", payload, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        user = User.objects.get(cpf=NOVO_CPF_5)
        client = make_client(user)
        self.assertEqual(client.get("/api/usuarios/").status_code, 403)
        self.assertEqual(client.get("/api/pacientes/").status_code, 403)

    def test_gerente_configures_category_permissions(self):
        category = Category.objects.get(name="Apoio")
        perm = GranularPermission.objects.get(codename="pacientes.view")
        response = self.gerente.put(
            f"/api/categorias/{category.pk}/permissoes/",
            {"permission_ids": [perm.pk]},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [p["codename"] for p in response.data["permissions"]],
            ["pacientes.view"],
        )

    def test_non_gerente_cannot_manage_categories(self):
        client = make_client(self.users[MEDICO_CPF])
        self.assertEqual(
            client.post("/api/profissoes/", {"name": "X"}, format="json").status_code,
            403,
        )
        self.assertEqual(client.get("/api/categorias/").status_code, 403)
        self.assertEqual(client.get("/api/permissoes/").status_code, 403)

    def test_free_professionals_list(self):
        medico = Profession.objects.get(name="Médico")
        Professional.objects.create(user=None, full_name="Livre", profession=medico)
        Professional.objects.create(
            user=None, full_name="Ocupado", profession=medico
        )
        ocupado = Professional.objects.get(full_name="Ocupado")
        payload = user_payload(profession=medico)
        payload.pop("professional")
        payload["professional_id"] = ocupado.pk
        self.assertEqual(
            self.gerente.post("/api/usuarios/", payload, format="json").status_code,
            201,
        )
        response = self.gerente.get("/api/profissionais-livres/")
        self.assertEqual(response.status_code, 200)
        names = [item["full_name"] for item in response.json()]
        self.assertIn("Livre", names)
        self.assertNotIn("Ocupado", names)
        client = make_client(self.users[MEDICO_CPF])
        self.assertEqual(client.get("/api/profissionais-livres/").status_code, 403)
