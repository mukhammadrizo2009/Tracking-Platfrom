"""
Backend tests for the Productivity Tracker.
Tests cover authentication, CRUD operations, data isolation, and business logic.
"""
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.utils import timezone
import datetime
import json

User = get_user_model()


class UserAuthTestCase(APITestCase):
    """Tests for authentication flows."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='securepass123',
        )
        self.user.has_password = True
        self.user.save()

    def test_email_login_success(self):
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'test@example.com',
            'password': 'securepass123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('email', response.data)

    def test_user_register(self):
        response = self.client.post('/api/v1/auth/register/', {
            'email': 'newuser@example.com',
            'password': 'brandNewPass123',
            'display_name': 'New User',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['email'], 'newuser@example.com')
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())

    def test_email_login_wrong_password(self):
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'test@example.com',
            'password': 'wrongpassword',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_current_user_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@example.com')

    def test_get_current_user_unauthenticated(self):
        response = self.client.get('/api/v1/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_set_password(self):
        google_user = User.objects.create_user(email='google@example.com')
        self.client.force_authenticate(user=google_user)
        response = self.client.post('/api/v1/auth/password/set/', {
            'new_password': 'newSecurePass123',
            'new_password_confirm': 'newSecurePass123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        google_user.refresh_from_db()
        self.assertTrue(google_user.has_password)

    def test_set_password_mismatch(self):
        google_user = User.objects.create_user(email='google2@example.com')
        self.client.force_authenticate(user=google_user)
        response = self.client.post('/api/v1/auth/password/set/', {
            'new_password': 'newSecurePass123',
            'new_password_confirm': 'differentPass123',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/auth/logout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class DataIsolationTestCase(APITestCase):
    """Tests that users cannot access each other's data."""

    def setUp(self):
        self.user1 = User.objects.create_user(email='user1@example.com')
        self.user2 = User.objects.create_user(email='user2@example.com')

    def test_goal_isolation(self):
        from apps.goals.models import Goal
        goal = Goal.objects.create(
            owner=self.user1,
            title='User 1 Goal',
            status='active',
        )
        self.client.force_authenticate(user=self.user2)
        
        # User2 cannot GET user1's goal
        response = self.client.get(f'/api/v1/goals/{goal.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # User2 cannot DELETE user1's goal
        response = self.client.delete(f'/api/v1/goals/{goal.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_study_record_isolation(self):
        from apps.study.models import StudyRecord
        record = StudyRecord.objects.create(
            owner=self.user1,
            date=datetime.date.today(),
            duration_minutes=60,
        )
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(f'/api/v1/study-records/{record.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_note_isolation(self):
        from apps.notes.models import QuickNote
        note = QuickNote.objects.create(
            owner=self.user1,
            content='Private note',
        )
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(f'/api/v1/notes/{note.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class GoalProgressTestCase(APITestCase):
    """Tests for automatic goal progress calculation."""

    def setUp(self):
        self.user = User.objects.create_user(email='goal_user@example.com')
        from apps.goals.models import Goal
        self.goal = Goal.objects.create(owner=self.user, title='Test Goal', status='active')
        self.client.force_authenticate(user=self.user)

    def test_progress_no_tasks(self):
        from apps.goals.models import Goal
        self.assertEqual(self.goal.progress, 0)

    def test_progress_with_tasks(self):
        from apps.goals.models import GoalTask
        t1 = GoalTask.objects.create(goal=self.goal, title='Task 1')
        t2 = GoalTask.objects.create(goal=self.goal, title='Task 2')
        t3 = GoalTask.objects.create(goal=self.goal, title='Task 3', is_completed=True)
        
        self.goal.refresh_from_db()
        # 1/3 = 33%
        self.assertEqual(self.goal.progress, 33)

    def test_progress_all_complete(self):
        from apps.goals.models import GoalTask
        GoalTask.objects.create(goal=self.goal, title='Task 1', is_completed=True)
        GoalTask.objects.create(goal=self.goal, title='Task 2', is_completed=True)
        self.assertEqual(self.goal.progress, 100)

    def test_task_complete_via_api(self):
        from apps.goals.models import GoalTask
        task = GoalTask.objects.create(goal=self.goal, title='Task 1')
        response = self.client.post(f'/api/v1/tasks/{task.id}/complete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertTrue(task.is_completed)

    def test_goal_days_remaining(self):
        from apps.goals.models import Goal
        future = datetime.date.today() + datetime.timedelta(days=5)
        goal = Goal.objects.create(owner=self.user, title='Future Goal', target_date=future)
        self.assertEqual(goal.days_remaining, 5)

    def test_goal_overdue(self):
        from apps.goals.models import Goal
        past = datetime.date.today() - datetime.timedelta(days=3)
        goal = Goal.objects.create(owner=self.user, title='Past Goal', target_date=past)
        self.assertEqual(goal.days_remaining, -3)

    def test_goal_no_deadline(self):
        from apps.goals.models import Goal
        goal = Goal.objects.create(owner=self.user, title='No Deadline Goal')
        self.assertIsNone(goal.days_remaining)


class StudyRecordTestCase(APITestCase):
    """Tests for study time tracking."""

    def setUp(self):
        self.user = User.objects.create_user(email='study@example.com')
        self.client.force_authenticate(user=self.user)

    def test_create_study_record(self):
        response = self.client.post('/api/v1/study-records/', {
            'date': str(datetime.date.today()),
            'duration_minutes': 90,
            'description': 'Math practice',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['duration_minutes'], 90)

    def test_invalid_duration(self):
        response = self.client.post('/api/v1/study-records/', {
            'date': str(datetime.date.today()),
            'duration_minutes': 0,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_assign_other_users_goal(self):
        other_user = User.objects.create_user(email='other@example.com')
        from apps.goals.models import Goal
        other_goal = Goal.objects.create(owner=other_user, title='Other Goal')
        
        response = self.client.post('/api/v1/study-records/', {
            'date': str(datetime.date.today()),
            'duration_minutes': 60,
            'goal': other_goal.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class HabitCompletionTestCase(APITestCase):
    """Tests for habit tracking and duplicate prevention."""

    def setUp(self):
        self.user = User.objects.create_user(email='habits@example.com')
        self.client.force_authenticate(user=self.user)
        from apps.habits.models import Habit
        self.habit = Habit.objects.create(owner=self.user, name='Exercise')

    def test_create_habit(self):
        response = self.client.post('/api/v1/habits/', {'name': 'Read'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_toggle_today(self):
        response = self.client.post(f'/api/v1/habits/{self.habit.id}/toggle-today/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['completed'])

    def test_no_duplicate_completion(self):
        from apps.habits.models import HabitCompletion
        today = datetime.date.today()
        HabitCompletion.objects.create(habit=self.habit, completion_date=today)
        
        # Second toggle should remove it (idempotent)
        response = self.client.post(f'/api/v1/habits/{self.habit.id}/toggle-today/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['completed'])

    def test_streak_calculation(self):
        from apps.habits.models import HabitCompletion
        today = datetime.date.today()
        for i in range(3):
            HabitCompletion.objects.create(
                habit=self.habit,
                completion_date=today - datetime.timedelta(days=i),
            )
        self.assertEqual(self.habit.current_streak, 3)

    def test_habit_list_includes_completions(self):
        from apps.habits.models import HabitCompletion
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        HabitCompletion.objects.create(habit=self.habit, completion_date=yesterday, status='done')
        response = self.client.get('/api/v1/habits/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # response may be a list or paginated dict
        results = response.data['results'] if isinstance(response.data, dict) and 'results' in response.data else response.data
        habit_data = next((h for h in results if h['id'] == self.habit.id), None)
        self.assertIsNotNone(habit_data)
        self.assertIn('completions', habit_data)
        self.assertEqual(len(habit_data['completions']), 1)
        self.assertEqual(habit_data['completions'][0]['completion_date'], str(yesterday))

    def test_past_date_completion_cannot_be_modified(self):
        yesterday = str(datetime.date.today() - datetime.timedelta(days=1))
        response = self.client.post(f'/api/v1/habits/{self.habit.id}/completions/', {
            'completion_date': yesterday,
            'status': 'done',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SleepRecordTestCase(APITestCase):
    """Tests for sleep record validation."""

    def setUp(self):
        self.user = User.objects.create_user(email='sleep@example.com')
        self.client.force_authenticate(user=self.user)

    def test_create_sleep_record(self):
        response = self.client.post('/api/v1/sleep-records/', {
            'date': str(datetime.date.today()),
            'duration_minutes': 480,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duplicate_date_rejected(self):
        today = str(datetime.date.today())
        self.client.post('/api/v1/sleep-records/', {
            'date': today, 'duration_minutes': 480,
        })
        response = self.client.post('/api/v1/sleep-records/', {
            'date': today, 'duration_minutes': 360,
        })
        # Should fail due to unique constraint
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_duration(self):
        response = self.client.post('/api/v1/sleep-records/', {
            'date': str(datetime.date.today()),
            'duration_minutes': 1500,  # > 24h
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class NoteTestCase(APITestCase):
    """Tests for notes CRUD and search."""

    def setUp(self):
        self.user = User.objects.create_user(email='notes@example.com')
        self.client.force_authenticate(user=self.user)

    def test_create_note(self):
        response = self.client.post('/api/v1/notes/', {
            'title': 'Test Note',
            'content': 'This is a test note.',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_search_notes(self):
        from apps.notes.models import QuickNote
        QuickNote.objects.create(owner=self.user, title='Python tips', content='Use list comprehensions')
        QuickNote.objects.create(owner=self.user, title='Django tricks', content='Use select_related')
        
        response = self.client.get('/api/v1/notes/?search=Python')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_empty_content_rejected(self):
        response = self.client.post('/api/v1/notes/', {
            'title': 'Empty',
            'content': '   ',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DashboardTestCase(APITestCase):
    """Tests for dashboard endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(email='dashboard@example.com')
        self.client.force_authenticate(user=self.user)

    def test_dashboard_authenticated(self):
        response = self.client.get('/api/v1/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('today', response.data)
        self.assertIn('study_time_today_minutes', response.data)
        self.assertIn('habits', response.data)

    def test_dashboard_empty_state(self):
        response = self.client.get('/api/v1/dashboard/')
        self.assertEqual(response.data['study_time_today_minutes'], 0)
        self.assertIsNone(response.data['sleep_today'])
        self.assertEqual(response.data['habits']['total'], 0)

    def test_dashboard_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/v1/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
