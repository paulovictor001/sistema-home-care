from accounts.models import Category, GranularPermission
from .test_support import ScaleFixture


class PermissionCatalogTests(ScaleFixture):
    def test_distinct_permissions_seeded_only_for_manager(self):
        actions = {'create', 'update', 'view', 'delete', 'change_status'}
        self.assertEqual(set(GranularPermission.objects.filter(feature='escalas').values_list('action', flat=True)), actions)
        self.assertEqual(set(Category.objects.get(name='Gerente').permissions.filter(feature='escalas').values_list('action', flat=True)), actions)
        for name in ('Médico', 'Enfermeiro'):
            self.assertFalse(Category.objects.get(name=name).permissions.filter(feature='escalas').exists())
