from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from django.views.static import serve
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import EmailTokenObtainPairView, MeView
from challenges.views import ChallengeViewSet

router = DefaultRouter()
router.register("challenges", ChallengeViewSet, basename="challenge")

urlpatterns = [
    path("admin/", admin.site.urls),
    # Public challenge photos are user-uploaded media, not collectstatic assets.
    # PythonAnywhere's /media/ static mapping can serve these more efficiently;
    # this route is a fallback for deployments where that mapping is unavailable.
    path("media/<path:path>", serve, {"document_root": settings.MEDIA_ROOT}),
    path("api/auth/token/", EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", MeView.as_view(), name="auth_me"),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
