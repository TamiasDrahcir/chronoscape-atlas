from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Issue JWTs using email + password instead of Django's default username field."""

    username_field = "email"
