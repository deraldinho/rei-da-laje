export function applyKiteVisualLod(kite3d, level = 0, featured = false) {
  const data = kite3d?.userData;
  if (!data) return 0;
  const lod = featured ? 0 : Math.max(0, Math.min(2, Math.floor(Number(level) || 0)));
  const showStructure = lod < 2;
  if (data.centerStick) data.centerStick.visible = showStructure;
  if (data.crossStick) data.crossStick.visible = showStructure;
  if (data.cabresto) data.cabresto.visible = showStructure;
  let hidden = showStructure ? 0 : 3;
  for (const item of data.fitilhos || []) {
    const mesh = item?.mesh;
    if (!mesh) continue;
    if (mesh.userData.lodManaged !== true) {
      const declared = mesh.userData.modelVisible;
      mesh.userData.lodBaseVisible = typeof declared === 'boolean' ? declared : Boolean(mesh.visible);
      mesh.userData.lodManaged = true;
    }
    const baseVisible = mesh.userData.lodBaseVisible !== false;
    const visible = lod === 0 && baseVisible;
    mesh.visible = visible;
    if (!visible) hidden++;
    if (lod === 0) mesh.userData.lodManaged = false;
  }
  return hidden;
}
