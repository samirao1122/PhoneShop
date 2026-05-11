from django.urls import path
# from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path('login/', views.login_view, name='login'),
    path('csrf/', views.csrf_token, name='csrf_token'),
    # path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # User management
    path('register/', views.register, name='register'),
    path('me/', views.me, name='me'),
    path('profile/', views.update_profile, name='update_profile'),
    path('change-password/', views.change_password, name='change_password'),
    path('logout/', views.logout, name='logout'),
    path('users/', views.UserListView.as_view(), name='user_list'),
]
