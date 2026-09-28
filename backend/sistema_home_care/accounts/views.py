from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .permissions import GroupNames, IsGerente
from .serializers import LoginSerializer


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
    return {
        "id": user.id,
        "cpf": user.cpf,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "groups": list(user.groups.values_list("name", flat=True)),
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

    permission_classes = [IsGerente]

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
