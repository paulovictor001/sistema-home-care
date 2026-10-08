"""Dados fictícios e repetíveis para apresentação local, nunca executados por migration."""
import json
import os
from datetime import date, time, timedelta
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import Category, GranularPermission, Profession, User
from accounts.services import create_managed_user, set_user_status
from assessments.models import AssessmentResource, CareNeed, PatientAssessment, Resource
from care_plans import services as plans
from care_plans.models import CarePlan
from care_scales import services as scales
from care_scales.models import CareScale, ProfessionalPlanningInfo
from patients.models import HealthCondition, NeedType, Patient, PatientAuditLog
from patients.serializers import PatientSerializer
from professionals.models import Professional


PROFILES = (
    ('gerente', 'Rubens Almeida', 'Gerente'),
    ('administrador', 'Alex Costa', 'Gerente'),
    ('medico', 'Marcos Oliveira', 'Médico'),
    ('enfermeiro', 'Ana Beatriz Souza', 'Enfermeiro'),
    ('enfermeira', 'Camila Santos', 'Enfermeiro'),
    ('fisioterapeuta', 'Bruno Ferreira', 'Fisioterapeuta (Demo)'),
    ('nutricionista', 'Daniela Lima', 'Nutricionista (Demo)'),
    ('terapeuta', 'Eduardo Ribeiro', 'Terapeuta ocupacional (Demo)'),
    ('fonoaudiologo', 'Fernanda Alves', 'Fonoaudiólogo (Demo)'),
    ('psicologo', 'Gabriel Martins', 'Psicólogo (Demo)'),
    ('apoio', 'Helena Rocha', 'Apoio (Demo)'),
    ('coordenador', 'Igor Mendes', 'Coordenador de escalas (Demo)'),
    ('inativo', 'Juliana Pereira', 'Apoio (Demo)'),
    ('cuidador', 'Lucas Barbosa', 'Cuidador (Demo)'),
)
NEEDS = (
    ('Enfermagem', 'enfermeiro', 'Acompanhamento de enfermagem domiciliar'),
    ('Médico', 'medico', 'Acompanhamento clínico domiciliar'),
    ('Fisioterapia', 'fisioterapeuta', 'Avaliação de mobilidade e acompanhamento funcional'),
    ('Nutrição', 'nutricionista', 'Avaliação e acompanhamento nutricional'),
    ('Terapia Ocupacional', 'terapeuta', 'Avaliação das atividades da vida diária'),
    ('Fonoaudiologia', 'fonoaudiologo', 'Avaliação e acompanhamento fonoaudiológico'),
    ('Psicologia', 'psicologo', 'Acolhimento e acompanhamento psicológico'),
    ('Outro', 'cuidador', 'Apoio nas atividades cotidianas'),
)
PATIENTS = (
    ('Maria das Graças Silva', 'Recuperação após internação', 'ACTIVE', 'ACTIVE'),
    ('José Antônio Costa', 'Mobilidade reduzida', 'DRAFT', 'DRAFT'),
    ('Francisca Helena Lima', 'Acompanhamento domiciliar', 'ACTIVE', 'SUSPENDED'),
    ('Antônio Carlos Pereira', 'Recuperação funcional', 'CLOSED', 'CLOSED'),
    ('Beatriz Nascimento', 'Avaliação inicial pendente', None, None),
    ('Paulo Roberto Almeida', 'Cadastro histórico', None, None),
)


def demo_cpf(index, patient=False):
    digits = [int(char) for char in f'{910000000 + index if patient else 900000000 + index:09d}']
    for length in (9, 10):
        remainder = sum(value * weight for value, weight in zip(digits, range(length + 1, 1, -1))) % 11
        digits.append(0 if remainder < 2 else 11 - remainder)
    return ''.join(map(str, digits))


class Command(BaseCommand):
    help = 'Cria usuários e cenários fictícios de apresentação sem apagar dados existentes.'

    def add_arguments(self, parser):
        parser.add_argument('--password', required=True, help='Senha das contas de demonstração; não é gravada no código.')
        parser.add_argument('--report', help='JSON local de credenciais e IDs (arquivo com acesso restrito).')

    @transaction.atomic
    def handle(self, *args, **options):
        password = options['password']
        if len(password) < 12:
            raise CommandError('Escolha uma senha de demonstração com pelo menos 12 caracteres.')
        # Preflight de todos os CPFs: uma colisão nunca altera dados de outra pessoa.
        for index, (key, name, profession) in enumerate(PROFILES, 1):
            existing = User.objects.filter(cpf=demo_cpf(index)).first()
            email = f'{key}@demo.homecare.invalid'
            if existing and (existing.email != email or not existing.check_password(password)):
                raise CommandError(f'CPF de demonstração {demo_cpf(index)} já usado ou senha diferente. Nenhum dado foi alterado.')
            if User.objects.filter(email=email).exclude(cpf=demo_cpf(index)).exists():
                raise CommandError(f'E-mail de demonstração já utilizado: {email}.')
        for index, (name, *_rest) in enumerate(PATIENTS, 1):
            existing = Patient.objects.filter(cpf=demo_cpf(index, patient=True)).first()
            if existing and existing.full_name != f'{name} (Demo)':
                raise CommandError('CPF de paciente de demonstração já utilizado. Nenhum dado foi alterado.')

        users, professionals = {}, {}
        created_users = 0
        for index, (key, name, profession_name) in enumerate(PROFILES, 1):
            profession, _ = Profession.objects.get_or_create(name=profession_name)
            category = Category.objects.get(name=profession_name)
            if key == 'coordenador':
                category.permissions.add(*GranularPermission.objects.filter(feature='escalas'))
            user = User.objects.filter(cpf=demo_cpf(index)).first()
            if user is None:
                first, last = name.split(' ', 1)
                user, professional = create_managed_user(cpf=demo_cpf(index), password=password,
                    email=f'{key}@demo.homecare.invalid', category=category,
                    first_name=first, last_name=f'{last} (Demo)',
                    professional_data={'full_name': f'{name} (Demo)', 'profession': profession},
                    actor=users.get('gerente'))
                created_users += 1
                if key == 'administrador':
                    user.is_staff = user.is_superuser = True
                    user.save(update_fields=['is_staff', 'is_superuser'])
                if key == 'inativo':
                    set_user_status(user=user, is_active=False, actor=users['gerente'])
            else:
                professional = user.professional
            users[key], professionals[key] = user, professional
            ProfessionalPlanningInfo.objects.get_or_create(professional=professional,
                defaults={'regions': ['Centro', 'Norte'], 'availability_notes': 'Demonstração: preferência por dias úteis; horários serão definidos no Agendamento.'})

        for name in ('Gaze estéril (Demo)', 'Luvas de procedimento (Demo)', 'Kit de avaliação (Demo)'):
            Resource.objects.get_or_create(name=name)
        resource = Resource.objects.get(name='Kit de avaliação (Demo)')
        # Exemplos para seleção de profissionais livres, sem conta de acesso.
        for key, name in (('enfermeiro', 'Larissa Melo'), ('fisioterapeuta', 'Ricardo Lopes')):
            Professional.objects.get_or_create(full_name=f'{name} (Demo, sem acesso)',
                profession=professionals[key].profession, user=None)
        types = {name: NeedType.objects.get(name=name) for name, _, _ in NEEDS}
        if any(value.status != 'ACTIVE' for value in types.values()):
            raise CommandError('Há tipo de necessidade inativo necessário para o cenário. Ative-o explicitamente antes de preparar a demo.')
        today = timezone.localdate()
        start, end = today - timedelta(days=7), today + timedelta(days=60)
        created_patients = 0
        patient_report = []
        for index, (name, condition, plan_status, scale_status) in enumerate(PATIENTS, 1):
            patient = Patient.objects.filter(cpf=demo_cpf(index, patient=True)).first()
            if patient is None:
                health, _ = HealthCondition.objects.get_or_create(name=f'{condition} (Demo)')
                birth = date(1954 + index * 4, 3, 15)
                serializer = PatientSerializer(data={'full_name': f'{name} (Demo)',
                    'cpf': demo_cpf(index, patient=True), 'birth_date': birth.isoformat(),
                    'age': today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day)),
                    'rg': f'DEMO-{index:04d}', 'phone': '(91) 00000-0000',
                    'gender': 'Feminino' if index in (1, 3, 5) else 'Masculino',
                    'responsible_doctor': users['medico'].pk, 'health_condition': health.pk,
                    'responsible_team': {'observacao': 'Equipe fictícia de apresentação'},
                    'address': {'zip_code': '00000-000', 'state': 'PA', 'city': 'Belém',
                        'neighborhood': 'Bairro de demonstração', 'street': 'Rua Fictícia',
                        'number': str(index * 10), 'complement': 'Endereço fictício',
                        'reference_point': 'Cenário de apresentação', 'region': 'Centro' if index % 2 else 'Norte'}})
                serializer.is_valid(raise_exception=True)
                patient = serializer.save()
                PatientAuditLog.objects.create(patient=patient, actor=users['gerente'], action='CREATE', changes={'demo': True})
                created_patients += 1
                if index == 6:
                    patient.status = 'INACTIVE'
                    patient.save(update_fields=['status', 'updated_at'])
                    PatientAuditLog.objects.create(patient=patient, actor=users['gerente'], action='INACTIVATE', changes={'status': ['ACTIVE', 'INACTIVE']})
                if plan_status:
                    assessment = PatientAssessment(patient=patient, professional=users['enfermeiro'],
                        assessment_date=today, assessment_time=time(9, index * 5),
                        request_origin=('Família', 'Hospital', 'Médico', 'Clínica')[index - 1],
                        request_reason='Preparação de acompanhamento domiciliar fictício.',
                        chief_complaint=f'{condition}. Cenário fictício, sem prescrição.',
                        current_condition='Registro ilustrativo para apresentação.',
                        conclusion='Necessidades registradas para demonstrar o fluxo do sistema.',
                        recommendation='Definir os responsáveis no Plano e na Escala.',
                        observations='Todos os dados deste caso são fictícios.')
                    assessment.full_clean()
                    assessment.save()
                    AssessmentResource.objects.create(assessment=assessment, resource=resource, quantity=1, observation='Recurso demonstrativo')
                    needs = []
                    for position, (type_name, key, description) in enumerate(NEEDS):
                        need = CareNeed(assessment=assessment, need_type=types[type_name],
                            description=f'{description} (Demo)', priority=('LOW', 'MEDIUM', 'HIGH', 'URGENT')[position % 4])
                        need.full_clean()
                        need.save()
                        needs.append(need)
                    plan = plans.create_plan(actor=users['medico'], patient=patient, start_date=start,
                        end_date=end, needs=needs, objective=f'Plano de demonstração: {condition}.')
                    for link, (_, key, _) in zip(plan.need_links.order_by('pk'), NEEDS):
                        plans.configure_need(actor=users['medico'], link=link,
                            data={'required_professional': professionals[key], 'frequency_quantity': 2,
                                'frequency_period': 'WEEK', 'resources': [{'resource': resource, 'quantity': 1, 'observation': 'Exemplo de recurso planejado'}]})
                    if plan_status != 'DRAFT':
                        plans.change_status(actor=users['medico'], plan=plan, target='ACTIVE')
                    if plan_status == 'CLOSED':
                        plans.close_plan(actor=users['enfermeiro'], plan=plan)
                    scale = scales.create_scale(actor=users['gerente'], patient=patient, care_plan=plan,
                        start_date=start, end_date=end, observation='Escala fictícia para apresentação; sem visitas ou horários agendados.')
                    items = []
                    for link, (_, key, _) in zip(plan.need_links.order_by('pk'), NEEDS):
                        item = scales.add_need(actor=users['gerente'], scale=scale, plan_need=link)
                        scales.add_professional(actor=users['gerente'], scale=scale, item_id=item.pk, professional=professionals[key])
                        items.append(item)
                    if index == 1:
                        first = items[0]
                        previous = first.assignments.get(removed_at__isnull=True)
                        scales.substitute_professional(actor=users['gerente'], scale=scale,
                            item_id=first.pk, assignment_id=previous.pk, professional=professionals['enfermeira'])
                        scales.configure_need(actor=users['gerente'], scale=scale, item_id=first.pk,
                            data={'frequency_quantity': 3, 'frequency_reason': 'Ajuste ilustrativo do planejamento',
                                'observation': 'Exemplo de observação por necessidade.'})
                        PatientAssessment.objects.create(patient=patient, professional=users['medico'],
                            assessment_date=today - timedelta(days=14), assessment_time=time(10),
                            request_origin='Família', request_reason='Registro histórico fictício',
                            chief_complaint='Avaliação anterior preservada', observations='Exemplo de histórico; não substitui a avaliação atual.')
                    if scale_status != 'DRAFT':
                        scales.change_status(actor=users['gerente'], scale=scale, status='ACTIVE')
                    if scale_status in ('SUSPENDED', 'CLOSED'):
                        scales.change_status(actor=users['gerente'], scale=scale, status=scale_status)
            patient_report.append({'id': patient.pk, 'name': patient.full_name, 'cpf': patient.cpf,
                'status': patient.status, 'plans': list(CarePlan.objects.filter(patient=patient).values('id', 'status')),
                'scales': list(CareScale.objects.filter(patient=patient, deleted_at__isnull=True).values('id', 'status'))})
        report = {'generated_at': timezone.now().isoformat(), 'password': password,
            'accounts': [{'profile': key, 'name': user.get_full_name(), 'cpf': user.cpf,
                'email': user.email, 'active': user.is_active, 'category': user.category.name,
                'groups': list(user.groups.values_list('name', flat=True)),
                'permissions': list(user.category.permissions.values_list('codename', flat=True))}
                for key, user in users.items()], 'patients': patient_report}
        if options['report']:
            target = Path(options['report'])
            # Dados de login ficam somente no relatório local solicitado.
            fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, 'w') as stream:
                json.dump(report, stream, indent=2, ensure_ascii=False)
        self.stdout.write(self.style.SUCCESS(f'Demonstração pronta: {len(users)} contas, {len(patient_report)} pacientes. Novos nesta execução: {created_users} usuários, {created_patients} pacientes.'))
