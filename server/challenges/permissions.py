from rest_framework.permissions import SAFE_METHODS, BasePermission

MEDIA_TEAM_GROUP = "Media Team"


def is_media_admin(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    return user.is_superuser or user.groups.filter(name=MEDIA_TEAM_GROUP).exists()


class IsMediaAdminOrReadOnlyActive(BasePermission):
    """Anyone can list/read; only media-team staff can create, edit, or delete."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return is_media_admin(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return is_media_admin(request.user)
