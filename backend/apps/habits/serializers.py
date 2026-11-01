from rest_framework import serializers
from django.utils import timezone
from .models import Habit, HabitCompletion


class HabitCompletionSerializer(serializers.ModelSerializer):
    date = serializers.DateField(source='completion_date', read_only=True)

    class Meta:
        model = HabitCompletion
        fields = ['id', 'completion_date', 'date', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']


class HabitSerializer(serializers.ModelSerializer):
    current_streak = serializers.IntegerField(read_only=True)
    best_streak = serializers.IntegerField(read_only=True)
    today_completed = serializers.SerializerMethodField()
    today_status = serializers.SerializerMethodField()
    completions = HabitCompletionSerializer(many=True, read_only=True)

    class Meta:
        model = Habit
        fields = [
            'id', 'name', 'description', 'is_active',
            'current_streak', 'best_streak', 'today_completed', 'today_status',
            'completions', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_today_completed(self, obj):
        today = timezone.now().date()
        return obj.completions.filter(completion_date=today, status='done').exists()

    def get_today_status(self, obj):
        today = timezone.now().date()
        completion = obj.completions.filter(completion_date=today).first()
        return completion.status if completion else 'none'


class HabitListSerializer(serializers.ModelSerializer):
    current_streak = serializers.IntegerField(read_only=True)
    best_streak = serializers.IntegerField(read_only=True)
    today_completed = serializers.SerializerMethodField()
    today_status = serializers.SerializerMethodField()
    completions = HabitCompletionSerializer(many=True, read_only=True)

    class Meta:
        model = Habit
        fields = [
            'id', 'name', 'description', 'is_active',
            'current_streak', 'best_streak', 'today_completed', 'today_status',
            'completions',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_today_completed(self, obj):
        today = timezone.now().date()
        return obj.completions.filter(completion_date=today, status='done').exists()

    def get_today_status(self, obj):
        today = timezone.now().date()
        completion = obj.completions.filter(completion_date=today).first()
        return completion.status if completion else 'none'
