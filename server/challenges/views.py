from rest_framework import viewsets

from .models import Challenge
from .permissions import IsMediaAdminOrReadOnlyActive, is_media_admin
from .serializers import ChallengeSerializer


class ChallengeViewSet(viewsets.ModelViewSet):
    serializer_class = ChallengeSerializer
    permission_classes = [IsMediaAdminOrReadOnlyActive]

    def get_queryset(self):
        queryset = Challenge.objects.all()
        if not is_media_admin(self.request.user):
            queryset = queryset.filter(is_active=True)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
