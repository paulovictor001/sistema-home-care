/** Formata telefone celular brasileiro como (DD) 9XXXX-XXXX. */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  if (digits.length <= 2) return `(${ddd}`;
  if (number.length <= 1) return `(${ddd}) ${number}`;
  if (number.length <= 5) return `(${ddd}) ${number[0]}${number.slice(1)}`;
  return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
}

export function stripPhone(value: string): string {
  return value.replace(/\D/g, "");
}
