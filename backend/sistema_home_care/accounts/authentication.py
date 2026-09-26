from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """Autentica via cookie HttpOnly, com fallback para o header Authorization.

    O frontend nunca manipula o token via JS: o browser envia o cookie
    automaticamente (fetch com `credentials: "include"`).

    Nota: SimpleJWT >= 5.5 resolve o token a partir do header dentro de
    `authenticate()`, por isso o override e feito aqui (e nao em
    `get_raw_token`, cuja assinatura recebe o header).
    """

    def authenticate(self, request):
        cookie_name = getattr(settings, "AUTH_COOKIE_ACCESS", "access_token")
        token = request.COOKIES.get(cookie_name)
        if token:
            validated_token = self.get_validated_token(token)
            return self.get_user(validated_token), validated_token
        return super().authenticate(request)
