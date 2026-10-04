from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Challenge(models.Model):
    """A single CSA photo moment used as a round prompt."""

    image = models.ImageField(upload_to="challenges/", blank=True, null=True)
    image_url = models.URLField(blank=True)
    alt_text = models.CharField(max_length=180)
    caption = models.CharField(max_length=90)
    photo_note = models.CharField(max_length=180)
    title = models.CharField(max_length=100)
    category = models.CharField(max_length=80)
    event_at = models.DateTimeField()
    latitude = models.FloatField(validators=[MinValueValidator(-90), MaxValueValidator(90)])
    longitude = models.FloatField(validators=[MinValueValidator(-180), MaxValueValidator(180)])
    place = models.CharField(max_length=120)
    description = models.TextField(max_length=1200)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-event_at"]

    def __str__(self):
        return self.title
