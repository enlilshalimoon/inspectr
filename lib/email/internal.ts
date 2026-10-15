// Our own test/internal accounts — never send them founder email.
export function isInternalEmail(email: string): boolean {
  const e = email.toLowerCase();
  return (
    e.endsWith("@enlil.studio") ||
    e.endsWith("@spyre.studio") ||
    e.includes("+lk@") ||
    e.includes("+test@") ||
    e.endsWith("@example.com") ||
    e === "enlilshalimoon@gmail.com"
  );
}
