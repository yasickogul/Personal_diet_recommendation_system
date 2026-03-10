"""
Send email reminder to users who have not finished logging all meals today.
Run daily via cron, e.g.: 0 20 * * * cd /path/to/Django_Backend && python manage.py send_meal_reminder
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.models import User
from planner.models import FoodLog


# Expected meal types per day (same as dashboard adherence)
MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner']


class Command(BaseCommand):
    help = 'Send email reminder to users who have not finished logging all meals today.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only print who would get emails, do not send.',
        )

    def handle(self, *args, **options):
        today = timezone.now().date()
        dry_run = options.get('dry_run', False)

        users_to_remind = []
        for user in User.objects.filter(is_active=True):
            if not user.email or not user.email.strip():
                continue
            today_logs = FoodLog.objects.filter(user=user, date=today)
            logged_types = set(today_logs.values_list('meal_type', flat=True).distinct())
            missing = set(MEAL_TYPES) - logged_types
            if missing:
                users_to_remind.append((user, list(missing)))

        if dry_run:
            self.stdout.write(f'Would send reminder to {len(users_to_remind)} user(s) for {today}')
            for user, missing in users_to_remind:
                self.stdout.write(f'  - {user.email}: missing {missing}')
            return

        subject = 'Reminder: Have you finished your meals today?'
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@dietapp.local')
        sent = 0
        for user, missing in users_to_remind:
            body = (
                f'Hi {user.username},\n\n'
                'This is a friendly reminder: have you finished logging your meals for today?\n\n'
                'Log your meals in the app to keep your diet on track.\n\n'
                'Best,\nDiet Recommendation System'
            )
            try:
                send_mail(
                    subject,
                    body,
                    from_email,
                    [user.email],
                    fail_silently=False,
                )
                sent += 1
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Failed to send to {user.email}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'Sent meal reminder to {sent} user(s) for {today}.'))
