from django.conf import settings
from django.utils.dateparse import parse_datetime
from rest_framework import serializers

from .models import Challenge


def _is_in_united_states(lat: float, lng: float) -> bool:
    return (
        (24 <= lat <= 50 and -126 <= lng <= -66)
        or (51 <= lat <= 73 and -180 <= lng <= -129)
        or (18 <= lat <= 23 and -161 <= lng <= -154)
    )


class ChallengeSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField(read_only=True)
    image_file = serializers.ImageField(write_only=True, required=False, allow_null=True)
    image_url = serializers.URLField(required=False, allow_blank=True)

    class Meta:
        model = Challenge
        fields = [
            "id", "image", "image_file", "image_url", "alt_text", "caption", "photo_note",
            "title", "category", "event_at", "latitude", "longitude", "place", "description",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_image(self, obj):
        request = self.context.get("request")
        if obj.image:
            url = obj.image.url
            return request.build_absolute_uri(url) if request else url
        return obj.image_url

    def validate_event_at(self, value):
        min_date = parse_datetime(settings.CHALLENGE_MIN_EVENT_AT)
        max_date = parse_datetime(settings.CHALLENGE_MAX_EVENT_AT)
        if not (min_date <= value <= max_date):
            raise serializers.ValidationError("Choose an event date between September 1, 2026 and June 1, 2027.")
        return value

    def validate(self, attrs):
        latitude = attrs.get("latitude", getattr(self.instance, "latitude", None))
        longitude = attrs.get("longitude", getattr(self.instance, "longitude", None))
        if latitude is not None and longitude is not None and not _is_in_united_states(latitude, longitude):
            raise serializers.ValidationError("Enter coordinates inside the United States, including Alaska or Hawaii.")

        has_existing_image = bool(getattr(self.instance, "image", None))
        image_file = attrs.get("image_file")
        image_url = attrs.get("image_url", getattr(self.instance, "image_url", ""))
        if not image_file and not image_url and not has_existing_image:
            raise serializers.ValidationError("Add a photo URL or upload a photo.")
        return attrs

    def create(self, validated_data):
        image_file = validated_data.pop("image_file", None)
        challenge = Challenge.objects.create(**validated_data)
        if image_file:
            challenge.image = image_file
            challenge.save(update_fields=["image"])
        return challenge

    def update(self, instance, validated_data):
        image_file = validated_data.pop("image_file", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if image_file:
            instance.image = image_file
        instance.save()
        return instance
