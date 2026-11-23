import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../lib/api";
import { formatCpf, stripCpf } from "../lib/cpf";
import { parseFieldErrors } from "../lib/patients";
import {
  createUser,
  getUser,
  listCategories,
  listFreeProfessionals,
  listProfessions,
  updateUser,
  type Category,
  type FreeProfessional,
  type Profession,
} from "../lib/users";

const inputClasses =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-background disabled:cursor-not-allowed";

function getErrorMessages(value: unknown): string[] {
  if (typeof value === "string") return [value];

  if (Array.isArray(value)) {
    return value.flatMap(getErrorMessages);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(getErrorMessages);
  }

  return [];
}

function FieldError({ messages }: { messages?: unknown }) {
  const text = getErrorMessages(messages).join(" ");

  if (!text) return null;

  return <p className="mt-1 text-xs text-red-600">{text}</p>;
}

export function UserForm({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isCreate = mode === "create";

  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [proMode, setProMode] = useState<"novo" | "existente">("novo");
  const [proFullName, setProFullName] = useState("");
  const [professionId, setProfessionId] = useState("");
  const [freeProId, setFreeProId] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [freePros, setFreePros] = useState<FreeProfessional[]>([]);
  const [lockedProfessional, setLockedProfessional] = useState<string | null>(
    null,
  );
  const [lockedCategory, setLockedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const [cats, pros, free] = await Promise.all([
          listCategories(),
          listProfessions(),
          listFreeProfessionals(),
        ]);
        if (cancelled) return;
        setCategories(cats.results);
        setProfessions(pros.results);
        setFreePros(free);
        if (!isCreate && id) {
          const user = await getUser(Number(id));
          if (cancelled) return;
          setCpf(formatCpf(user.cpf));
          setEmail(user.email);
          setFirstName(user.first_name);
          setLastName(user.last_name);
          setLockedCategory(user.category_detail?.name ?? null);
          setLockedProfessional(
            user.professional_detail
              ? `${user.professional_detail.full_name} · ${user.professional_detail.profession.name}`
              : null,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Falha ao carregar dados.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [id, isCreate]);

  function handleProfessionChange(value: string) {
    setProfessionId(value);
    // Espelho categoria <-> profissão: sugere a categoria homônima.
    const chosen = professions.find((p) => String(p.id) === value);
    if (chosen) {
      const mirror = categories.find((c) => c.name === chosen.name);
      if (mirror) setCategoryId(String(mirror.id));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setError(null);
    try {
      if (isCreate) {
        const payload = {
          cpf: stripCpf(cpf),
          password,
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          category: Number(categoryId),
          ...(proMode === "novo"
            ? {
                professional: {
                  full_name: proFullName.trim(),
                  profession: Number(professionId),
                },
              }
            : { professional_id: Number(freeProId) }),
        };
        const created = await createUser(payload);
        navigate(`/usuarios/${created.id}`);
      } else if (id) {
        await updateUser(Number(id), {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          ...(password ? { password } : {}),
        });
        navigate(`/usuarios/${id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = parseFieldErrors(err.message);
        if (parsed.detail && Object.keys(parsed).length === 1) {
          setError(parsed.detail[0]);
        } else {
          setErrors(parsed);
        }
      } else {
        setError("Falha ao salvar usuário.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          to="/usuarios"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-primary"
        >
          <span aria-hidden="true">←</span>
          Voltar para usuários
        </Link>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            {isCreate ? "Novo usuário" : "Editar usuário"}
          </h2>

          <p className="mt-1 text-sm text-muted">
            {isCreate
              ? "Preencha os dados abaixo para cadastrar um novo usuário no sistema."
              : "Atualize as informações de acesso e identificação do usuário."}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-7 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6"
      >
        {/* DADOS DE ACESSO */}
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">Dados de acesso</h3>
            <p className="mt-1 text-xs text-muted">
              Informações utilizadas para acessar o sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                CPF *
              </span>
              <input
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                disabled={!isCreate}
                className={inputClasses}
              />
              <FieldError messages={errors.cpf} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                {isCreate ? "Senha *" : "Nova senha (opcional)"}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClasses}
              />
              <FieldError messages={errors.password} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              E-mail *
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
            />
            <FieldError messages={errors.email} />
          </label>
        </section>

        {/* DADOS PESSOAIS */}
        <section className="space-y-4 border-t border-line pt-6">
          <div>
            <h3 className="text-sm font-semibold text-ink">Dados pessoais</h3>
            <p className="mt-1 text-xs text-muted">
              Informações de identificação do usuário.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Nome
              </span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClasses}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Sobrenome
              </span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClasses}
              />
            </label>
          </div>
        </section>

        {/* VÍNCULO PROFISSIONAL */}
        <section className="space-y-4 border-t border-line pt-6">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              Vínculo profissional
            </h3>
            <p className="mt-1 text-xs text-muted">
              Defina a categoria e o profissional associado ao usuário.
            </p>
          </div>

          {isCreate ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Categoria *
              </span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClasses}
              >
                <option value="">Selecione…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError messages={errors.category} />
            </label>
          ) : (
            <p className="rounded-lg border border-line bg-background px-3 py-3 text-sm text-ink">
              Categoria: <strong>{lockedCategory ?? "—"}</strong>
              <span className="text-muted">
                {" "}
                (acompanha a profissão; use a transferência de profissão para
                alterar)
              </span>
            </p>
          )}

          {isCreate ? (
            <fieldset className="space-y-4 rounded-xl border border-line p-4">
              <legend className="px-2 text-sm font-medium text-ink">
                Profissional vinculado *
              </legend>

              <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-ink">
                  <input
                    type="radio"
                    checked={proMode === "novo"}
                    onChange={() => setProMode("novo")}
                    className="accent-primary"
                  />
                  Cadastrar novo
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-ink">
                  <input
                    type="radio"
                    checked={proMode === "existente"}
                    onChange={() => setProMode("existente")}
                    className="accent-primary"
                  />
                  Vincular existente
                </label>
              </div>

              {proMode === "novo" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">
                      Nome do profissional *
                    </span>
                    <input
                      value={proFullName}
                      onChange={(e) => setProFullName(e.target.value)}
                      className={inputClasses}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">
                      Profissão *
                    </span>
                    <select
                      value={professionId}
                      onChange={(e) => handleProfessionChange(e.target.value)}
                      className={inputClasses}
                    >
                      <option value="">Selecione…</option>
                      {professions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    Profissional sem acesso *
                  </span>
                  <select
                    value={freeProId}
                    onChange={(e) => setFreeProId(e.target.value)}
                    className={inputClasses}
                  >
                    <option value="">Selecione…</option>
                    {freePros.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} · {p.profession__name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <FieldError messages={errors.professional} />
            </fieldset>
          ) : (
            <p className="rounded-lg border border-line bg-background px-3 py-3 text-sm text-ink">
              Profissional: <strong>{lockedProfessional ?? "—"}</strong>
              <span className="text-muted">
                {" "}
                (não pode ser trocado; para outro profissional ter acesso, crie
                outro usuário)
              </span>
            </p>
          )}
        </section>

        {/* AÇÕES */}
        <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
          <Link
            to="/usuarios"
            className="inline-flex items-center justify-center rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-background"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Salvando…"
              : isCreate
                ? "Criar usuário"
                : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
