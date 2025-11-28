from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PaymentViewSet,
    PayoutViewSet,
    AdminPaymentManagementViewSet,
    TeacherPaymentInfoViewSet
)

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'payouts', PayoutViewSet, basename='payout')
router.register(r'admin/payment-management', AdminPaymentManagementViewSet, basename='admin-payment-management')
router.register(r'teacher-payment-info', TeacherPaymentInfoViewSet, basename='teacher-payment-info')

urlpatterns = [
    path('', include(router.urls)),
]

