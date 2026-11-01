from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import IntegrityError
from .models import Habit, HabitCompletion
from .serializers import HabitSerializer, HabitListSerializer, HabitCompletionSerializer


class HabitViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return HabitListSerializer
        return HabitSerializer

    def get_queryset(self):
        qs = Habit.objects.filter(owner=self.request.user).prefetch_related('completions')
        show_inactive = self.request.query_params.get('include_inactive', 'false').lower() == 'true'
        if not show_inactive:
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get', 'post'], url_path='completions')
    def completions(self, request, pk=None):
        habit = self.get_object()
        if request.method == 'GET':
            completions = habit.completions.all()
            serializer = HabitCompletionSerializer(completions, many=True)
            return Response(serializer.data)
        
        # POST: create a completion
        date_str = request.data.get('completion_date', str(timezone.now().date()))
        try:
            import datetime
            completion_date = datetime.date.fromisoformat(date_str)
        except (ValueError, TypeError):
            return Response({'detail': 'Invalid date format.'}, status=status.HTTP_400_BAD_REQUEST)
        
        today = timezone.now().date()
        if completion_date < today:
            return Response(
                {'detail': 'Past dates cannot be modified.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            completion, created = HabitCompletion.objects.get_or_create(
                habit=habit,
                completion_date=completion_date,
                defaults={'status': 'done'},
            )
            if not created:
                # Update status if provided
                new_status = request.data.get('status', completion.status)
                if new_status in ('none', 'partial', 'done'):
                    if new_status == 'none':
                        completion.delete()
                        return Response({'status': 'none'}, status=status.HTTP_200_OK)
                    completion.status = new_status
                    completion.save(update_fields=['status', 'updated_at'])
            serializer = HabitCompletionSerializer(completion)
            if created:
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.data)
        except IntegrityError:
            return Response({'detail': 'Already completed for this date.'}, status=status.HTTP_409_CONFLICT)

    @action(detail=True, methods=['delete'], url_path='completions/(?P<completion_id>[0-9]+)')
    def delete_completion(self, request, pk=None, completion_id=None):
        habit = self.get_object()
        try:
            completion = HabitCompletion.objects.get(id=completion_id, habit=habit)
            today = timezone.now().date()
            if completion.completion_date < today:
                return Response(
                    {'detail': 'Past dates cannot be modified.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            completion.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except HabitCompletion.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='toggle-today')
    def toggle_today(self, request, pk=None):
        """Toggle or cycle today's habit completion."""
        habit = self.get_object()
        today = timezone.now().date()
        completion = HabitCompletion.objects.filter(habit=habit, completion_date=today).first()
        requested_status = request.data.get('status') if request.data else None
        cycle_mode = request.data.get('cycle', False) if request.data else False

        if requested_status:
            if requested_status == 'none':
                if completion:
                    completion.delete()
                return Response({'status': 'none', 'completed': False})
            if completion:
                completion.status = requested_status
                completion.save(update_fields=['status', 'updated_at'])
            else:
                completion = HabitCompletion.objects.create(
                    habit=habit, completion_date=today, status=requested_status
                )
            return Response({'status': requested_status, 'completed': (requested_status == 'done')})

        if cycle_mode:
            if completion is None:
                HabitCompletion.objects.create(habit=habit, completion_date=today, status='partial')
                return Response({'status': 'partial', 'completed': False})
            elif completion.status == 'partial':
                completion.status = 'done'
                completion.save(update_fields=['status', 'updated_at'])
                return Response({'status': 'done', 'completed': True})
            else:
                completion.delete()
                return Response({'status': 'none', 'completed': False})

        # Default binary toggle for quick dashboard actions
        if completion is None:
            HabitCompletion.objects.create(habit=habit, completion_date=today, status='done')
            return Response({'status': 'done', 'completed': True})
        else:
            completion.delete()
            return Response({'status': 'none', 'completed': False})

    @action(detail=True, methods=['post'], url_path='set-status-today')
    def set_status_today(self, request, pk=None):
        """Directly set today's completion status: none | partial | done."""
        habit = self.get_object()
        today = timezone.now().date()
        new_status = request.data.get('status', 'done')
        if new_status not in ('none', 'partial', 'done'):
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_status == 'none':
            HabitCompletion.objects.filter(habit=habit, completion_date=today).delete()
            return Response({'status': 'none', 'completed': False})

        completion, _ = HabitCompletion.objects.get_or_create(
            habit=habit,
            completion_date=today,
            defaults={'status': new_status},
        )
        completion.status = new_status
        completion.save(update_fields=['status', 'updated_at'])
        return Response({'status': new_status, 'completed': new_status == 'done'})
