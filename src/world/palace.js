import * as THREE from 'three';
import { Kit, hall, terrace, gateBase, wall, bridge, riverBanks, paifang, paving } from './architecture.js';
import { G, COURT, APPROACH, WALL, GATE, RIVER, ARCH, TERRACE, STAIR, HALL, terraceTop, stairTopZ, stairLowZ, SIDE_HALLS, setColliderTop } from './layout.js';

export function createPalace() {
  const kit = new Kit();

  // Main hall on the three-tier terrace
  terrace(kit, { ...TERRACE, G, stairW: STAIR.w, stairTopZ, stairLowZ });
  const hh = hall(kit, { x: 0, y: terraceTop, z: HALL.cz, w: HALL.w, d: HALL.d, colH: HALL.colH, bays: HALL.bays, double: true });
  setColliderTop('hall', terraceTop + hh);
  console.info('main hall height above terrace:', hh.toFixed(1));

  // Fortress gate + gate hall + corner pavilions
  gateBase(kit, { ...GATE, G });
  const gy = G + GATE.h + 1.6;
  setColliderTop('gateHall', gy + hall(kit, { x: 0, y: gy, z: GATE.z, ...GATE.hall, double: true }));
  for (const s of [-1, 1]) hall(kit, { x: s * 92, y: gy, z: GATE.z, w: 22, d: 22, colH: 9, bays: 3, double: true, plaque: false });

  // Enclosure walls
  const o = { ...WALL, G }, xw = COURT.x + WALL.t / 2, zb = COURT.zMin - WALL.t / 2;
  wall(kit, -xw, zb, -xw, GATE.z, o);
  wall(kit, xw, zb, xw, GATE.z, o);
  wall(kit, -xw, zb, xw, zb, o);
  wall(kit, -xw, GATE.z, -GATE.w / 2, GATE.z, o);
  wall(kit, GATE.w / 2, GATE.z, xw, GATE.z, o);

  // Golden Water river + five bridges
  riverBanks(kit, { ...RIVER, x0: -COURT.x, x1: COURT.x, G });
  for (const b of RIVER.bridges) bridge(kit, { ...b, z: RIVER.z, len: RIVER.bridgeLen, rise: RIVER.rise, G, bed: RIVER.bed });

  // Paifang on the axis
  paifang(kit, { ...ARCH, G });

  // Side halls flanking the courtyard (scale + rhythm)
  SIDE_HALLS.forEach((h, i) => setColliderTop('side' + i, G + hall(kit, { ...h, y: G, double: false, roof: 'green', plaque: false })));

  const group = kit.build();
  group.add(createPaving());
  return group;
}

// Stone paving: courtyard (with a hole for the river) + approach road.
function createPaving() {
  const mat = new THREE.MeshStandardMaterial({ map: paving, roughness: 0.9 });
  const rect = (x0, z0, x1, z1) => {
    const s = new THREE.Shape();   // shape space: (x, -z)
    s.moveTo(x0, -z0); s.lineTo(x1, -z0); s.lineTo(x1, -z1); s.lineTo(x0, -z1); s.lineTo(x0, -z0);
    return s;
  };
  const court = rect(-COURT.x, COURT.zMin, COURT.x, COURT.zMax);
  const rz0 = RIVER.z - RIVER.w / 2, rz1 = RIVER.z + RIVER.w / 2;
  court.holes.push(rect(-COURT.x + 0.01, rz0, COURT.x - 0.01, rz1));
  const road = rect(-APPROACH.x, COURT.zMax, APPROACH.x, APPROACH.zMax);
  const g = new THREE.ShapeGeometry([court, road]).rotateX(-Math.PI / 2).translate(0, G, 0);
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  return mesh;
}
