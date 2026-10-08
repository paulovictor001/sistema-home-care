from django.contrib.auth.models import AnonymousUser
from rest_framework.exceptions import PermissionDenied
from accounts.models import GranularPermission
from assessments.tests_api import SEM_GRUPO_CPF
from .models import ScaleNeed, ScaleAssignment, CareScale
from .permissions import has_scale_permission, visible_scales, require_scale_permission, ACTIONS
from .test_support import ScaleFixture


class ScaleAuthorizationTests(ScaleFixture):
    def test_manager_and_independent_grants_without_clinical_group(self):
        user = self.users[SEM_GRUPO_CPF]
        for action in ACTIONS:
            self.assertTrue(has_scale_permission(self.manager, action))
            self.assertFalse(has_scale_permission(user, action))
        user.category.permissions.add(GranularPermission.objects.get(codename='escalas.update'))
        require_scale_permission(user, 'update', self.scale)
        with self.assertRaises(PermissionDenied):
            require_scale_permission(user, 'delete', self.scale)
        user.is_active = False
        self.assertFalse(has_scale_permission(user, 'update'))
        self.assertFalse(has_scale_permission(AnonymousUser(), 'view'))
        self.assertFalse(has_scale_permission(self.manager, 'unknown'))

    def test_assigned_professional_sees_only_current_own_scales(self):
        user = self.users[SEM_GRUPO_CPF]
        self.professional.user = user
        self.professional.save()
        item = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link)
        assignment = ScaleAssignment.objects.create(item=item, professional=self.professional)
        other = CareScale.objects.create(patient=self.patient, care_plan=self.plan)
        self.assertEqual(list(visible_scales(user)), [self.scale])
        require_scale_permission(user, 'view', self.scale)
        for action, scale in (('view', other), ('update', self.scale)):
            with self.assertRaises(PermissionDenied):
                require_scale_permission(user, action, scale)
        from django.utils import timezone
        assignment.removed_at = timezone.now()
        assignment.save()
        self.assertFalse(visible_scales(user).exists())
