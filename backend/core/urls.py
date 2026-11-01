"""
URL configuration for the FlowPulse project.
Serves both the React SPA frontend and the Django REST Framework backend on the same domain.
"""
import os
import mimetypes
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse, FileResponse
from django.urls import path, re_path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

# Locate frontend dist directory
FRONTEND_DIST = os.path.join(settings.BASE_DIR, 'frontend_dist')
if not os.path.isdir(FRONTEND_DIST):
    FRONTEND_DIST = os.path.join(settings.BASE_DIR.parent, 'frontend', 'dist')


def serve_react(request, path=""):
    """
    Serves static assets (JS, CSS, SVGs) if present in FRONTEND_DIST,
    otherwise serves index.html for client-side React SPA routing.
    """
    if path:
        safe_path = os.path.normpath(path).lstrip('/\\')
        file_path = os.path.join(FRONTEND_DIST, safe_path)
        if os.path.isfile(file_path):
            content_type, _ = mimetypes.guess_type(file_path)
            if file_path.endswith('.js'):
                content_type = 'application/javascript'
            elif file_path.endswith('.css'):
                content_type = 'text/css'
            elif file_path.endswith('.svg'):
                content_type = 'image/svg+xml'
            response = FileResponse(open(file_path, 'rb'), content_type=content_type)
            if 'assets/' in safe_path.replace('\\', '/'):
                response['Cache-Control'] = 'public, max-age=31536000, immutable'
            return response

    index_path = os.path.join(FRONTEND_DIST, 'index.html')
    if os.path.isfile(index_path):
        response = FileResponse(open(index_path, 'rb'), content_type='text/html')
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response

    return HttpResponse("FlowPulse frontend build not found.", status=503)


urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # API v1
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/', include('apps.goals.urls')),
    path('api/v1/', include('apps.study.urls')),
    path('api/v1/', include('apps.sleep.urls')),
    path('api/v1/', include('apps.habits.urls')),
    path('api/v1/', include('apps.plans.urls')),
    path('api/v1/', include('apps.notes.urls')),
    path('api/v1/', include('apps.notifications.urls')),
    path('api/v1/', include('apps.dashboard.urls')),
    path('api/v1/', include('apps.statistics.urls')),

    # OAuth (allauth)
    path('accounts/', include('allauth.urls')),

    # OpenAPI Schema & Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Health check
    path('health/', include('apps.dashboard.health_urls')),

    # Frontend React SPA: Root, assets, static files, and SPA fallback
    path('', serve_react, kwargs={'path': ''}, name='react-root'),
    re_path(r'^(?P<path>assets/.*)$', serve_react, name='react-assets'),
    re_path(r'^(?P<path>favicon\.svg|icons\.svg|manifest\.json|robots\.txt)$', serve_react, name='react-static'),
    re_path(r'^(?P<path>(?!api/|admin/|accounts/|health/).*)$', serve_react, name='react-spa-fallback'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
