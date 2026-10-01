export function resolveAuthoritativeCombat(isAuthority, resolver, kiteA, kiteB, inter, delta, contact) {
  if (!isAuthority || typeof resolver !== 'function') return null;
  return resolver(kiteA, kiteB, inter, delta, contact);
}
