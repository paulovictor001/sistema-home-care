from django.conf import settings
from django.contrib.auth import get_user_model, password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.core.exceptions import ValidationError
import logging
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .permissions import (
    GroupNames,
    IsEnfermeiro,
    IsGerente,
    IsMedico,
    RequirePermission,
)
from .serializers import LoginSerializer

logger = logging.getLogger(__name__)


def _cookie_kwargs(max_age: int) -> dict:
    return {
        "httponly": getattr(settings, "SIMPLE_JWT", {}).get(
            "AUTH_COOKIE_HTTP_ONLY", True
        ),
        "secure": getattr(settings, "SIMPLE_JWT", {}).get(
            "AUTH_COOKIE_SECURE", False
        ),
        "samesite": getattr(settings, "SIMPLE_JWT", {}).get(
            "AUTH_COOKIE_SAMESITE", "Lax"
        ),
        "path": getattr(settings, "SIMPLE_JWT", {}).get("AUTH_COOKIE_PATH", "/"),
        "max_age": max_age,
    }


def _set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    access_lifetime = settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
    refresh_lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
    response.set_cookie(
        settings.AUTH_COOKIE_ACCESS,
        access,
        **_cookie_kwargs(int(access_lifetime.total_seconds())),
    )
    response.set_cookie(
        settings.AUTH_COOKIE_REFRESH,
        refresh,
        **_cookie_kwargs(int(refresh_lifetime.total_seconds())),
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(settings.AUTH_COOKIE_ACCESS, path="/")
    response.delete_cookie(settings.AUTH_COOKIE_REFRESH, path="/")


def _user_payload(user) -> dict:
    category = getattr(user, "category", None)
    if category is not None:
        permissions = list(
            category.permissions.values_list("codename", flat=True)
        )
        category_payload = {"id": category.pk, "name": category.name}
    else:
        permissions = []
        category_payload = None
    return {
        "id": user.id,
        "is_superuser": user.is_superuser,
        "cpf": user.cpf,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "groups": list(user.groups.values_list("name", flat=True)),
        "category": category_payload,
        "permissions": permissions,
    }


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        response = Response(
            {"user": _user_payload(user)}, status=status.HTTP_200_OK
        )
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = str(request.data.get("email", "")).strip()
        user = get_user_model().objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            base = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
            link = f"{base}/login?uid={uid}&token={token}"
            try:
                send_mail(
                    "Redefinição de senha — Sistema Home Care",
                    f"Para definir uma nova senha, acesse: {link}\n\nO link expira em {settings.PASSWORD_RESET_TIMEOUT // 60} minutos.",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
            except Exception:
                # Não variar a resposta pública quando o SMTP está indisponível.
                logger.exception("Falha ao enviar e-mail de redefinição de senha")
        return Response(
            {"detail": "Se houver uma conta ativa com esse e-mail, enviaremos instruções de redefinição."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        uid = request.data.get("uid", "")
        token = request.data.get("token", "")
        password = request.data.get("password", "")
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = get_user_model().objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, get_user_model().DoesNotExist):
            user = None
        if not user or not token or not default_token_generator.check_token(user, token):
            return Response({"detail": "Link inválido ou expirado."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            password_validation.validate_password(password, user)
        except ValidationError as exc:
            return Response({"password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"detail": "Senha redefinida. Faça login com a nova senha."}, status=status.HTTP_200_OK)


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if not raw:
            return Response(
                {"detail": "Sessao expirada. Faca login novamente."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            old_refresh = RefreshToken(raw)
            user_id = old_refresh["user_id"]
            from django.contrib.auth import get_user_model

            user = get_user_model().objects.get(id=user_id)
            new_refresh = RefreshToken.for_user(user)
            # Rotacao: invalida o refresh antigo.
            try:
                old_refresh.blacklist()
            except (AttributeError, TokenError):
                pass
        except (TokenError, InvalidToken):
            response = Response(
                {"detail": "Sessao expirada. Faca login novamente."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_auth_cookies(response)
            return response
        except Exception:
            return Response(
                {"detail": "Sessao expirada. Faca login novamente."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        response = Response({"detail": "Sessao renovada."}, status=status.HTTP_200_OK)
        _set_auth_cookies(response, str(new_refresh.access_token), str(new_refresh))
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except (TokenError, InvalidToken, AttributeError):
                pass
        response = Response(
            {"detail": "Sessao encerrada."}, status=status.HTTP_200_OK
        )
        _clear_auth_cookies(response)
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"user": _user_payload(request.user)})


class MedicoListView(APIView):
    """Lista usuarios ativos do grupo MEDICO (somente gerente).

    Suporte ao formulario de cadastro/edicao do paciente (select de
    medico responsavel). Escopo minimo intencional: sem paginacao nem
    busca; endpoint generico de profissionais fica para o modulo
    proprio.
    """

    permission_classes = [IsGerente, RequirePermission("medicos.view")]

    def get(self, request):
        medicos = (
            get_user_model()
            .objects.filter(
                groups__name=GroupNames.MEDICO, is_active=True
            )
            .order_by("first_name", "last_name", "cpf")
            .values("id", "first_name", "last_name", "cpf")
        )
        return Response(list(medicos))


class ClinicoListView(APIView):
    """Lista usuarios ativos da equipe clinica (MEDICO + ENFERMEIRO).

    Suporte ao select de profissional responsavel da Avaliacao Inicial:
    `GET /api/medicos/` e somente-gerente, entao a equipe clinica nao
    tinha de onde escolher o responsavel (gap de UX do frontend).
    Escopo minimo intencional: sem paginacao nem busca; endpoint
    generico de profissionais fica para o modulo proprio.
    """

    permission_classes = [
        IsGerente | IsMedico | IsEnfermeiro,
        RequirePermission("avaliacoes.view"),
    ]

    def get(self, request):
        clinicos = (
            get_user_model()
            .objects.filter(
                groups__name__in=(
                    GroupNames.MEDICO,
                    GroupNames.ENFERMEIRO,
                ),
                is_active=True,
            )
            .order_by("first_name", "last_name", "cpf")
            .values("id", "first_name", "last_name", "cpf")
        )
        return Response(list(clinicos))
