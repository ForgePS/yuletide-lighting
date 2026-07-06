/** Mapbox public token for client map rendering (pk.ey…). */
export function getMapboxPublicToken() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}
