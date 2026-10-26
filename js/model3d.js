// 3D preview of the build, assembled from simple shapes in three.js.
// Units are inches. +x points out the muzzle, +y is up, +z is the rifle's right
// side (ejection port side). The front face of the upper receiver sits at x = 0.
import * as THREE from "three";
import { OrbitControls } from "../vendor/OrbitControls.js";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";
import { RoundedBoxGeometry } from "../vendor/RoundedBoxGeometry.js";

const RAIL_TOP = 1.32;    // top of the Picatinny teeth on the upper receiver
const OPTIC_AXIS = 2.86;  // optic centre line for a standard 1.54" mount height
const GROUND = -9.8;      // just below the magazine

/* ---------------- materials ---------------- */
const MAT = {
  poly:  new THREE.MeshStandardMaterial({ color: 0x1d1e20, roughness: 0.82, metalness: 0.05 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x2c2e31, roughness: 0.38, metalness: 0.8 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.5, metalness: 0.45 }),
  hole:  new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1, metalness: 0 }),
  red:   new THREE.MeshStandardMaterial({ color: 0xa3221b, roughness: 0.4, metalness: 0.6 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x6fb3c4, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.45, clearcoat: 1 }),
  dot:   new THREE.MeshBasicMaterial({ color: 0xff2a1a })
};
const finishMats = {};
function finishMat(o) {
  if (!finishMats[o.id]) {
    const anodized = o.id === "blk";
    finishMats[o.id] = new THREE.MeshStandardMaterial({
      color: new THREE.Color(o.color), roughness: anodized ? 0.5 : 0.78, metalness: anodized ? 0.45 : 0.12
    });
  }
  return finishMats[o.id];
}

/* ---------------- shape helpers ---------------- */
function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
// Extrude a side-view outline (x,y points) to a given width, centred on z = 0.
// A point written as ["q", cx, cy, x, y] is a quadratic curve to (x, y).
function side(points, width, mat, bevel = 0.06) {
  const s = new THREE.Shape();
  points.forEach((p, i) => {
    if (i === 0) s.moveTo(p[0], p[1]);
    else if (p[0] === "q") s.quadraticCurveTo(p[1], p[2], p[3], p[4]);
    else s.lineTo(p[0], p[1]);
  });
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: width - 2 * bevel, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 16
  });
  geo.translate(0, 0, -(width - 2 * bevel) / 2);
  return mesh(geo, mat);
}
// Cylinder along x from x0 to x1 (radius r0 at x0, r1 at x1).
function cylX(r0, r1, x0, x1, mat, y = 0, z = 0, seg = 32) {
  const geo = new THREE.CylinderGeometry(r1, r0, x1 - x0, seg);
  geo.rotateZ(-Math.PI / 2);
  const m = mesh(geo, mat);
  m.position.set((x0 + x1) / 2, y, z);
  return m;
}
function cylZ(r, len, mat, x, y, z = 0, seg = 20) {
  const geo = new THREE.CylinderGeometry(r, r, len, seg);
  geo.rotateX(Math.PI / 2);
  const m = mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
function box(x0, x1, y0, y1, w, mat, z = 0, r = 0) {
  const geo = r > 0 ? new RoundedBoxGeometry(x1 - x0, y1 - y0, w, 3, r) : new THREE.BoxGeometry(x1 - x0, y1 - y0, w);
  const m = mesh(geo, mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
  return m;
}
// Picatinny rail: a base strip plus teeth every 0.394".
function rail(g, x0, x1, yBase, mat) {
  g.add(box(x0, x1, yBase, yBase + 0.25, 0.83, mat));
  const n = Math.floor((x1 - x0 - 0.1) / 0.394);
  const tooth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.21, 0.12, 0.83), mat, n);
  tooth.castShadow = true;
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    mtx.makeTranslation(x0 + 0.2 + i * 0.394 + 0.1, yBase + 0.31, 0);
    tooth.setMatrixAt(i, mtx);
  }
  g.add(tooth);
}
// A small part placed on the surface of a cylinder of radius r at an angle around the bore.
function onBore(m, r, angleDeg) {
  const a = THREE.MathUtils.degToRad(angleDeg);
  m.position.y = r * Math.sin(a); m.position.z = r * Math.cos(a);
  m.rotation.x = -(a - Math.PI / 2);
  return m;
}
// Lens glass at both ends of an optic tube.
function lenses(g, x0, x1, r, y) {
  g.add(cylX(r * 0.86, r * 0.86, x0 - 0.02, x0 + 0.04, MAT.glass, y));
  g.add(cylX(r * 0.86, r * 0.86, x1 - 0.04, x1 + 0.02, MAT.glass, y));
}

/* ---------------- the rifle ---------------- */
function buildRifle(b) {
  const g = new THREE.Group();
  const F = finishMat(opt("finish", b));
  const bar = opt("barrel", b), hg = opt("handguard", b), L = bar.len;

  // upper receiver
  g.add(side([[-7.3, -0.45], [0, -0.45], [0, 0.95], [-7.3, 0.95]], 0.9, F, 0.05));
  rail(g, -7.2, -0.1, 0.95, F);
  g.add(box(-4.3, -1.9, -0.05, 0.55, 0.05, MAT.hole, 0.45));                 // ejection port
  g.add(box(-5.6, -4.75, 0.25, 0.9, 0.3, F, 0.55, 0.08));                    // brass deflector
  g.add(cylX(0.27, 0.27, -7.05, -5.8, F, 0.45, 0.52));                       // forward assist
  g.add(cylX(0.62, 0.62, -0.05, 0.35, MAT.steel));                           // barrel nut

  // charging handle
  const chW = b.ch === "ambi" ? 2.3 : 1.6;
  g.add(box(-7.75, -7.3, 0.55, 0.85, 0.55, MAT.black));
  g.add(box(-8.1, -7.75, 0.5, 0.9, chW, MAT.black, 0, 0.08));

  // lower receiver
  g.add(side([[-7.6, -0.45], [0, -0.45], [0, -1.15], [-1.4, -1.3], [-1.55, -2.6], [-4.3, -2.6], [-4.45, -1.4], [-7.0, -1.4], [-7.6, -1.0]], 0.85, F, 0.06));
  g.add(box(-6.25, -4.35, -2.15, -1.95, 0.35, F, 0, 0.05));                  // trigger guard
  g.add(box(-4.55, -4.35, -2.15, -1.4, 0.35, F));
  g.add(cylZ(0.12, 0.95, MAT.steel, -0.4, -0.85));                           // pivot pin
  g.add(cylZ(0.12, 0.95, MAT.steel, -6.85, -0.85));                          // takedown pin
  g.add(cylZ(0.2, 0.12, MAT.steel, -5.55, -0.95, -0.47));                    // safety
  g.add(box(-5.6, -4.9, -1.05, -0.85, 0.08, MAT.steel, -0.53, 0.03));
  g.add(cylZ(0.18, 0.14, MAT.steel, -4.0, -1.55, 0.47));                     // mag release
  const trig = b.trigger === "mil" ? MAT.steel : MAT.red;
  g.add(side([[-5.0, -1.4], [-4.82, -1.4], ["q", -4.72, -1.75, -5.02, -2.02], [-5.14, -1.96], ["q", -4.95, -1.75, -5.0, -1.4]], 0.24, trig, 0.02));

  // magazine
  g.add(side([[-4.2, -1.5], [-1.6, -1.5], ["q", -1.3, -5.8, -0.2, -8.7], [-2.75, -9.35], ["q", -3.95, -5.9, -4.2, -1.5]], 0.82, MAT.poly, 0.07));
  g.add(side([[-0.05, -8.6], [-2.9, -9.42], [-2.95, -9.62], [0.0, -8.8]], 1.0, MAT.poly, 0.05)); // floorplate

  // pistol grip
  const grips = {
    a2:   [[-5.0, -1.35], [-6.45, -1.35], [-7.65, -4.55], ["q", -7.2, -4.95, -6.45, -4.8], [-5.25, -1.9]],
    ergo: [[-4.95, -1.35], [-6.5, -1.35], ["q", -7.4, -2.8, -7.8, -4.6], ["q", -7.3, -5.1, -6.4, -4.85], ["q", -5.7, -3.0, -4.95, -1.35]],
    vert: [[-5.05, -1.35], [-6.4, -1.35], [-6.95, -4.7], ["q", -6.4, -5.0, -5.6, -4.8], [-5.15, -1.9]]
  };
  g.add(side(grips[b.grip], 1.05, MAT.poly, 0.14));

  // buffer tube + stock
  if (b.stock === "a2s") {
    g.add(side([[-7.6, 0.62], [-21.4, 0.8], [-21.4, -5.4], [-20.3, -5.4], [-8.9, -1.55], [-7.6, -1.35]], 1.45, MAT.poly, 0.18));
    g.add(box(-21.9, -21.3, -5.45, 0.85, 1.55, MAT.poly, 0, 0.12));         // butt plate
  } else {
    g.add(cylX(0.58, 0.58, -15.2, -7.5, MAT.black, -0.1));
    g.add(cylX(0.7, 0.7, -8.0, -7.55, MAT.steel, -0.1));                     // castle nut
    if (b.stock === "sop") {
      g.add(side([[-10.6, 0.62], [-18.6, 1.15], [-18.6, -4.1], [-17.6, -4.1], [-12.8, -1.5], [-10.6, -1.0]], 1.6, MAT.poly, 0.15));
      for (const z of [-0.95, 0.95]) g.add(cylX(0.42, 0.42, -17.6, -12.4, MAT.poly, 0.25, z));
      g.add(box(-19.1, -18.5, -4.2, 1.2, 1.75, MAT.poly, 0, 0.12));
    } else {
      g.add(side([[-11.0, 0.55], [-18.3, 0.9], [-18.3, -3.9], [-17.5, -3.9], [-13.3, -1.3], [-11.0, -0.8]], 1.4, MAT.poly, 0.13));
      g.add(box(-18.75, -18.25, -3.95, 0.95, 1.55, MAT.poly, 0, 0.12));
    }
  }

  // barrel
  g.add(cylX(0.37, 0.37, 0.3, L, MAT.steel, 0, 0, 24));

  // handguard + front sight
  if (hg.ff) {
    const Lh = hg.len, apothem = 0.97;
    const oct = new THREE.CylinderGeometry(1.05, 1.05, Lh - 0.1, 8);
    oct.rotateY(Math.PI / 8); oct.rotateZ(-Math.PI / 2);
    const ff = mesh(oct, F); ff.position.x = 0.05 + (Lh - 0.1) / 2; g.add(ff);
    rail(g, 0.1, Lh, apothem - 0.02, F);
    for (let x = 1.1; x + 1.3 < Lh - 0.4; x += 1.95) {
      for (const z of [-apothem - 0.005, apothem + 0.005]) g.add(box(x, x + 1.27, -0.15, 0.15, 0.03, MAT.hole, z, 0.01));
      g.add(box(x, x + 1.27, -apothem - 0.02, -apothem + 0.02, 0.3, MAT.hole));
    }
    if (b.front === "bu") {
      const x = Lh - 1.5;
      g.add(box(x, x + 1.1, 1.25, 1.55, 0.9, MAT.poly, 0, 0.05));
      g.add(side([[x + 0.15, 1.55], [x + 0.95, 1.55], [x + 0.75, 2.45], [x + 0.35, 2.45]], 0.75, MAT.poly, 0.05));
      g.add(box(x + 0.51, x + 0.59, 2.2, 2.6, 0.08, MAT.steel));
    }
  } else {
    g.add(cylX(1.05, 1.05, 0.3, 0.75, F));                                     // delta ring
    g.add(cylX(0.95, 0.88, 0.75, 6.95, MAT.poly, 0, 0, 28));
    for (let x = 1.6; x < 6.4; x += 0.62) for (const z of [-0.9, 0.9]) g.add(cylZ(0.11, 0.06, MAT.hole, x, 0.32, z));
    g.add(cylX(0.98, 0.98, 6.9, 7.15, F));                                     // handguard cap
    g.add(cylX(0.6, 0.6, 7.4, 8.3, F));                                        // front sight base
    g.add(side([[7.5, 0.4], [8.2, 0.4], [8.05, 1.75], [7.65, 1.75]], 0.72, F, 0.04));
    for (const z of [-0.3, 0.3]) g.add(box(7.65, 8.05, 1.7, 2.45, 0.12, F, z, 0.03));
    g.add(box(7.82, 7.9, 1.75, 2.35, 0.08, MAT.steel));
    g.add(box(7.55, 8.05, -0.95, -0.55, 0.3, F));                              // bayonet lug
  }

  // muzzle device
  const m = b.muzzle;
  if (m === "a2") {
    g.add(cylX(0.42, 0.42, L, L + 2.25, MAT.steel, 0, 0, 24));
    for (const a of [30, 90, 150]) g.add(onBore(box(L + 0.9, L + 2.05, -0.03, 0.03, 0.14, MAT.hole), 0.42, a));
  } else if (m === "tri") {
    g.add(cylX(0.42, 0.42, L, L + 0.6, MAT.steel, 0, 0, 24));
    for (const a of [90, 210, 330]) g.add(onBore(box(L + 0.6, L + 2.3, -0.1, 0.1, 0.24, MAT.steel), 0.3, a));
  } else if (m === "comp") {
    g.add(cylX(0.5, 0.5, L, L + 2.3, MAT.steel, 0, 0, 24));
    for (const x of [0.6, 1.15, 1.7]) for (const z of [-0.505, 0.505]) g.add(box(L + x, L + x + 0.32, -0.2, 0.2, 0.02, MAT.hole, z));
    for (const x of [0.8, 1.5]) g.add(box(L + x, L + x + 0.25, 0.49, 0.51, 0.22, MAT.hole));
  } else {
    g.add(cylX(0.5, 0.5, L, L + 1.8, MAT.steel, 0, 0, 24));
    g.add(cylX(0.6, 0.6, L + 0.2, L + 0.6, MAT.steel, 0, 0, 24));
    g.add(cylX(0.5, 0.38, L + 1.8, L + 2.05, MAT.steel, 0, 0, 24));
  }

  // rear sight — flipped down when an optic is mounted
  if (b.rear === "bu") {
    g.add(box(-7.1, -5.9, 1.25, 1.55, 0.9, MAT.poly, 0, 0.05));
    if (b.optic === "none") {
      g.add(side([[-6.95, 1.55], [-6.05, 1.55], [-6.3, 2.55], [-6.7, 2.55]], 0.75, MAT.poly, 0.05));
      g.add(cylX(0.07, 0.07, -6.75, -6.25, MAT.hole, 2.3));
    } else {
      g.add(box(-7.0, -6.0, 1.55, 1.8, 0.75, MAT.poly, 0, 0.05));
    }
  }

  // optics
  const o = b.optic, Y = OPTIC_AXIS;
  if (o === "rd") {
    g.add(box(-2.2, -0.6, RAIL_TOP, 2.25, 1.0, MAT.black, 0, 0.08));           // riser
    g.add(cylX(0.66, 0.66, -2.35, -0.45, MAT.poly, Y, 0, 32));
    g.add(cylZ(0.25, 0.5, MAT.poly, -1.4, Y, 0.7));                           // brightness knob
    lenses(g, -2.35, -0.45, 0.66, Y);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), MAT.dot).translateX(-1.4).translateY(Y));
    if (b.magnifier === "mag3") {
      g.add(box(-5.1, -3.1, RAIL_TOP, 2.25, 0.95, MAT.black, 0, 0.08));
      g.add(cylX(0.62, 0.62, -5.6, -2.8, MAT.poly, Y, 0, 32));
      g.add(cylX(0.74, 0.74, -5.75, -5.15, MAT.poly, Y, 0, 32));
      g.add(cylZ(0.2, 0.3, MAT.black, -4.1, Y, 0.75));                        // flip hinge
      lenses(g, -5.75, -2.8, 0.62, Y);
    }
  } else if (o === "lp6" || o === "lp8") {
    const t = o === "lp8" ? 0.67 : 0.59;   // 34 mm vs 30 mm tube radius in inches
    const ocularStart = o === "lp8" ? -7.8 : -7.4;
    g.add(box(-4.9, -0.5, RAIL_TOP, 1.65, 0.95, MAT.black, 0, 0.06));           // cantilever base
    for (const [x0, x1] of [[-4.3, -3.6], [-1.5, -0.8]]) {
      g.add(box(x0, x1, 1.6, Y, 0.55, MAT.black, 0, 0.05));
      g.add(cylX(t + 0.13, t + 0.13, x0, x1, MAT.black, Y, 0, 32));            // rings
    }
    g.add(cylX(t, t, -5.0, 0.9, MAT.poly, Y, 0, 32));                          // main tube
    g.add(cylX(t + 0.12, t + 0.12, -2.7, -1.6, MAT.poly, Y, 0, 32));            // turret housing
    const elev = new THREE.CylinderGeometry(0.36, 0.36, 0.55, 24);
    g.add(mesh(elev, MAT.poly).translateX(-2.15).translateY(Y + t + 0.25));    // elevation turret
    g.add(cylZ(0.36, 0.55, MAT.poly, -2.15, Y, t + 0.25));                     // windage turret
    g.add(cylX(0.85, 0.85, ocularStart, -5.6, MAT.poly, Y, 0, 32));            // eyepiece
    g.add(cylX(0.85, t, -5.6, -5.0, MAT.poly, Y, 0, 32));
    g.add(box(-6.6, -6.2, Y - 0.15, Y + 0.15, 0.45, MAT.poly, 0.95, 0.05));    // throw lever
    g.add(cylX(t, 0.92, 0.9, 1.8, MAT.poly, Y, 0, 32));                         // objective bell
    g.add(cylX(0.92, 0.92, 1.8, 2.9, MAT.poly, Y, 0, 32));
    lenses(g, ocularStart, 2.9, 0.85, Y);
  }
  return g;
}

function disposeTree(obj) {
  obj.traverse(c => { if (c.geometry) c.geometry.dispose(); });
}

/* ---------------- viewer ---------------- */
export class RifleView {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.8;

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-12, 40, 28);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -30, right: 30, top: 20, bottom: -20, near: 1, far: 120 });
    key.shadow.bias = -0.0005;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.9);   // lights the left side
    fill.position.set(10, 15, -30);
    this.scene.add(fill);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.6));

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.18 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = GROUND; ground.receiveShadow = true;
    this.scene.add(ground);

    this.camera = new THREE.PerspectiveCamera(28, 16 / 9, 1, 1000);
    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 20, maxDistance: 160, maxPolarAngle: Math.PI * 0.62 });
    this.controls.addEventListener("start", () => { this.flight = null; });

    this.rifle = null;
    this.center = new THREE.Vector3();
    this.size = new THREE.Vector3(40, 12, 3);
    this.flight = null;
    this.firstFit = true;

    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  update(build) {
    if (this.rifle) { this.scene.remove(this.rifle); disposeTree(this.rifle); }
    this.rifle = buildRifle(build);
    this.scene.add(this.rifle);
    const bb = new THREE.Box3().setFromObject(this.rifle);
    bb.getCenter(this.center);
    this.size = bb.getSize(new THREE.Vector3());
    if (this.firstFit) { this.firstFit = false; this.setView("quarter", true); }
    else this.flyTo(this.camera.position.clone().sub(this.controls.target).add(this.center), this.center);
  }

  // Camera position for a named view, distance chosen to fit the whole rifle.
  viewPosition(name) {
    // Fit the rifle's length across the frame (with a margin), or its height if the frame is tall.
    const vHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect);
    const d = Math.max(this.size.x / 2 / Math.tan(hHalf), this.size.y / 2 / Math.tan(vHalf)) * 1.12 + this.size.z;
    const c = this.center;
    const dirs = {
      right:   new THREE.Vector3(0, 0.08, 1),
      left:    new THREE.Vector3(0, 0.08, -1),
      quarter: new THREE.Vector3(0.45, 0.32, 0.84),
      top:     new THREE.Vector3(0, 1, 0.02)
    };
    return dirs[name].normalize().multiplyScalar(d).add(c);
  }

  setView(name, instant = false) {
    const pos = this.viewPosition(name);
    if (instant) { this.camera.position.copy(pos); this.controls.target.copy(this.center); this.controls.update(); }
    else this.flyTo(pos, this.center);
  }

  // Move the camera around the rifle (not through it) by easing its angle and distance.
  flyTo(pos, target) {
    const from = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    const to = new THREE.Spherical().setFromVector3(pos.clone().sub(target));
    if (to.theta - from.theta > Math.PI) to.theta -= 2 * Math.PI;
    if (from.theta - to.theta > Math.PI) to.theta += 2 * Math.PI;
    this.flight = { from, to, fromTarget: this.controls.target.clone(), target: target.clone(), start: performance.now() };
  }

  tick() {
    if (this.flight) {
      const f = this.flight;
      const t = Math.min(1, (performance.now() - f.start) / 700);
      const e = 1 - Math.pow(1 - t, 3);
      const s = new THREE.Spherical(
        THREE.MathUtils.lerp(f.from.radius, f.to.radius, e),
        THREE.MathUtils.lerp(f.from.phi, f.to.phi, e),
        THREE.MathUtils.lerp(f.from.theta, f.to.theta, e));
      this.controls.target.lerpVectors(f.fromTarget, f.target, e);
      this.camera.position.setFromSpherical(s).add(this.controls.target);
      if (t === 1) this.flight = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
