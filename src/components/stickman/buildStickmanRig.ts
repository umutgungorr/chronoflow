import * as THREE from 'three';

export const STAIR_COUNT = 5;
export const STAIR_DX = 0.88;
export const STAIR_RISE = 0.4;
export const STAIR_X0 = -((STAIR_COUNT - 1) * STAIR_DX) / 2;

export type StickmanRig = {
  root: THREE.Group;
  pelvis: THREE.Group;
  spine: THREE.Group;
  head: THREE.Group;
  chestCore: THREE.Mesh;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  mouth: THREE.Mesh;
  sunglasses: THREE.Group;
  crown: THREE.Group;
  materials: {
    body: THREE.MeshStandardMaterial;
    limb: THREE.MeshStandardMaterial;
    joint: THREE.MeshStandardMaterial;
    core: THREE.MeshStandardMaterial;
    glassFrame: THREE.MeshStandardMaterial;
  };
  disposables: { dispose: () => void }[];
};

export type StairScene = {
  group: THREE.Group;
  steps: {
    topMat: THREE.MeshStandardMaterial;
    trimMat: THREE.MeshStandardMaterial;
  }[];
  flagPoleMat: THREE.MeshStandardMaterial;
  flagMesh: THREE.Mesh;
  flagMat: THREE.MeshStandardMaterial;
  disposables: { dispose: () => void }[];
};

/**
 * Gerçek 3D eklemli stickman iskeleti oluşturur.
 * `root` grubunun tabanı y = 0'dadır (ayakkabı altları doğrudan basamağa basar).
 */
export function buildStickmanRig(): StickmanRig {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // PBR Materyaller (mat-metalik siber-karakter dokusu)
  const bodyMat = track(
    new THREE.MeshStandardMaterial({
      color: '#4ade80',
      roughness: 0.32,
      metalness: 0.25,
      emissive: '#064e3b',
      emissiveIntensity: 0.25,
    }),
  );
  const limbMat = track(
    new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.28,
      metalness: 0.45,
    }),
  );
  const jointMat = track(
    new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.35,
      metalness: 0.65,
    }),
  );
  const shoeMat = track(
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.4,
      metalness: 0.35,
    }),
  );
  const coreMat = track(
    new THREE.MeshStandardMaterial({
      color: '#2ee6b8',
      emissive: '#2ee6b8',
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.3,
    }),
  );
  const eyeMat = track(
    new THREE.MeshStandardMaterial({
      color: '#05080c',
      roughness: 0.15,
      metalness: 0.8,
    }),
  );
  const glassLensMat = track(
    new THREE.MeshPhysicalMaterial({
      color: '#030712',
      roughness: 0.08,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    }),
  );
  const glassFrameMat = track(
    new THREE.MeshStandardMaterial({
      color: '#2ee6b8',
      emissive: '#2ee6b8',
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.5,
    }),
  );
  const goldMat = track(
    new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      emissive: '#b45309',
      emissiveIntensity: 0.35,
      roughness: 0.22,
      metalness: 0.88,
    }),
  );

  // Paylaşılan geometriler
  const torsoGeo = track(new THREE.CylinderGeometry(0.16, 0.105, 0.52, 24));
  const pelvisGeo = track(new THREE.CapsuleGeometry(0.105, 0.06, 8, 16));
  const neckGeo = track(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 16));
  const headGeo = track(new THREE.SphereGeometry(0.23, 32, 24));
  const coreGeo = track(new THREE.OctahedronGeometry(0.065, 1));
  const shoulderBarGeo = track(new THREE.CapsuleGeometry(0.048, 0.32, 8, 16));

  const upperArmGeo = track(new THREE.CapsuleGeometry(0.042, 0.24, 8, 16));
  const forearmGeo = track(new THREE.CapsuleGeometry(0.036, 0.23, 8, 16));
  const handGeo = track(new THREE.SphereGeometry(0.056, 16, 12));
  const jointSphereGeo = track(new THREE.SphereGeometry(0.058, 16, 12));

  const thighGeo = track(new THREE.CapsuleGeometry(0.056, 0.32, 8, 16));
  const shinGeo = track(new THREE.CapsuleGeometry(0.046, 0.32, 8, 16));
  const shoeGeo = track(new THREE.BoxGeometry(0.13, 0.08, 0.24));
  const soleGeo = track(new THREE.BoxGeometry(0.135, 0.024, 0.245));

  const root = new THREE.Group();

  // Kalça kökü (y = 0.94 -> ayak altları tam y = 0)
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.94, 0);
  root.add(pelvis);

  const pelvisMesh = new THREE.Mesh(pelvisGeo, jointMat);
  pelvisMesh.rotation.z = Math.PI / 2;
  pelvisMesh.castShadow = true;
  pelvis.add(pelvisMesh);

  // Omurga & Gövde
  const spine = new THREE.Group();
  spine.position.set(0, 0.04, 0);
  pelvis.add(spine);

  const torsoMesh = new THREE.Mesh(torsoGeo, bodyMat);
  torsoMesh.position.set(0, 0.26, 0);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  spine.add(torsoMesh);

  const shoulderBar = new THREE.Mesh(shoulderBarGeo, limbMat);
  shoulderBar.rotation.z = Math.PI / 2;
  shoulderBar.position.set(0, 0.48, 0);
  shoulderBar.castShadow = true;
  spine.add(shoulderBar);

  // Göğüste parlayan ChronoFlow çekirdeği
  const chestCore = new THREE.Mesh(coreGeo, coreMat);
  chestCore.position.set(0, 0.33, 0.14);
  chestCore.scale.set(1, 1.2, 0.45);
  spine.add(chestCore);

  // Boyun & Kafa
  const neckMesh = new THREE.Mesh(neckGeo, jointMat);
  neckMesh.position.set(0, 0.56, 0);
  spine.add(neckMesh);

  const head = new THREE.Group();
  head.position.set(0, 0.8, 0);
  spine.add(head);

  const headMesh = new THREE.Mesh(headGeo, bodyMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  // Gözler
  const eyeGeo = track(new THREE.SphereGeometry(0.032, 16, 12));
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.075, 0.025, 0.205);
  leftEye.scale.set(1, 1.15, 0.5);
  head.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.075, 0.025, 0.205);
  rightEye.scale.set(1, 1.15, 0.5);
  head.add(rightEye);

  // Gülümseme yayı
  const mouthGeo = track(new THREE.TorusGeometry(0.06, 0.011, 10, 20, Math.PI * 0.72));
  const mouth = new THREE.Mesh(mouthGeo, eyeMat);
  mouth.position.set(0, -0.055, 0.195);
  mouth.rotation.z = Math.PI * 1.14;
  head.add(mouth);

  // 3D Güneş Gözlüğü (Deal With It)
  const sunglasses = new THREE.Group();
  sunglasses.position.set(0, 0.42, 0);
  sunglasses.visible = false;
  head.add(sunglasses);

  const lensGeo = track(new THREE.BoxGeometry(0.145, 0.088, 0.025));
  const frameGeo = track(new THREE.BoxGeometry(0.16, 0.102, 0.018));
  const bridgeGeo = track(new THREE.BoxGeometry(0.055, 0.02, 0.02));
  const templeGeo = track(new THREE.BoxGeometry(0.016, 0.02, 0.22));

  [-1, 1].forEach((side) => {
    const x = side * 0.095;
    const frame = new THREE.Mesh(frameGeo, glassFrameMat);
    frame.position.set(x, 0.025, 0.232);
    sunglasses.add(frame);

    const lens = new THREE.Mesh(lensGeo, glassLensMat);
    lens.position.set(x, 0.025, 0.242);
    sunglasses.add(lens);

    const temple = new THREE.Mesh(templeGeo, glassFrameMat);
    temple.position.set(side * 0.17, 0.03, 0.13);
    sunglasses.add(temple);
  });
  const bridge = new THREE.Mesh(bridgeGeo, glassFrameMat);
  bridge.position.set(0, 0.035, 0.236);
  sunglasses.add(bridge);

  // 3D Altın Taç (7+ gün seride aktif)
  const crown = new THREE.Group();
  crown.position.set(0, 0.22, 0);
  crown.visible = false;
  head.add(crown);

  const crownBandGeo = track(new THREE.CylinderGeometry(0.145, 0.13, 0.06, 20, 1, true));
  const crownBand = new THREE.Mesh(crownBandGeo, goldMat);
  crownBand.position.y = 0.02;
  crown.add(crownBand);

  const spikeGeo = track(new THREE.ConeGeometry(0.036, 0.11, 8));
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const spike = new THREE.Mesh(spikeGeo, goldMat);
    spike.position.set(Math.sin(angle) * 0.13, 0.09, Math.cos(angle) * 0.13);
    crown.add(spike);
  }
  const crownGem = new THREE.Mesh(coreGeo, coreMat);
  crownGem.position.set(0, 0.035, 0.145);
  crownGem.scale.setScalar(0.45);
  crown.add(crownGem);

  // Kol üreteci (sağ/sol simetrik)
  const makeArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.22, 0.48, 0);
    spine.add(shoulder);

    const sJoint = new THREE.Mesh(jointSphereGeo, jointMat);
    shoulder.add(sJoint);

    const upper = new THREE.Mesh(upperArmGeo, limbMat);
    upper.position.set(0, -0.16, 0);
    upper.castShadow = true;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.32, 0);
    shoulder.add(elbow);

    const eJoint = new THREE.Mesh(jointSphereGeo, jointMat);
    eJoint.scale.setScalar(0.85);
    elbow.add(eJoint);

    const lower = new THREE.Mesh(forearmGeo, limbMat);
    lower.position.set(0, -0.15, 0);
    lower.castShadow = true;
    elbow.add(lower);

    const hand = new THREE.Mesh(handGeo, bodyMat);
    hand.position.set(0, -0.31, 0);
    hand.castShadow = true;
    elbow.add(hand);

    return { shoulder, elbow };
  };

  // Bacak üreteci (sağ/sol simetrik)
  const makeLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, -0.02, 0);
    pelvis.add(hip);

    const hJoint = new THREE.Mesh(jointSphereGeo, jointMat);
    hip.add(hJoint);

    const thigh = new THREE.Mesh(thighGeo, limbMat);
    thigh.position.set(0, -0.22, 0);
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.44, 0);
    hip.add(knee);

    const kJoint = new THREE.Mesh(jointSphereGeo, jointMat);
    kJoint.scale.setScalar(0.88);
    knee.add(kJoint);

    const shin = new THREE.Mesh(shinGeo, limbMat);
    shin.position.set(0, -0.22, 0);
    shin.castShadow = true;
    knee.add(shin);

    // Ayakkabı (alt tabanı tam -0.48 -> kalça y = 0.94 iken taban tam y = 0.00)
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(0, -0.43, 0.05);
    shoe.castShadow = true;
    knee.add(shoe);

    const sole = new THREE.Mesh(soleGeo, coreMat);
    sole.position.set(0, -0.468, 0.05);
    knee.add(sole);

    return { hip, knee };
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  return {
    root,
    pelvis,
    spine,
    head,
    chestCore,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    mouth,
    sunglasses,
    crown,
    materials: {
      body: bodyMat,
      limb: limbMat,
      joint: jointMat,
      core: coreMat,
      glassFrame: glassFrameMat,
    },
    disposables,
  };
}

/**
 * 5 basamaklı neon detaylı 3D merdiven ve zirve bayrağı oluşturur.
 */
export function buildStaircase(): StairScene {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const group = new THREE.Group();
  const steps: StairScene['steps'] = [];
  const baseFloorY = -0.35;

  const sideBodyMat = track(
    new THREE.MeshStandardMaterial({
      color: '#0b121a',
      roughness: 0.7,
      metalness: 0.35,
    }),
  );

  for (let i = 0; i < STAIR_COUNT; i++) {
    const x = STAIR_X0 + i * STAIR_DX;
    const topY = i * STAIR_RISE;
    const height = topY - baseFloorY;

    const topMat = track(
      new THREE.MeshStandardMaterial({
        color: '#111b26',
        roughness: 0.35,
        metalness: 0.55,
        emissive: '#064e3b',
        emissiveIntensity: 0.1,
      }),
    );

    const trimMat = track(
      new THREE.MeshStandardMaterial({
        color: '#2ee6b8',
        emissive: '#2ee6b8',
        emissiveIntensity: 0.15,
        roughness: 0.25,
        metalness: 0.4,
      }),
    );

    // Basamak gövdesi
    const bodyGeo = track(new THREE.BoxGeometry(STAIR_DX + 0.04, height, 1.05));
    const body = new THREE.Mesh(bodyGeo, sideBodyMat);
    body.position.set(x, baseFloorY + height / 2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Basamak üst yürüme plakası
    const treadGeo = track(new THREE.BoxGeometry(STAIR_DX + 0.05, 0.045, 1.08));
    const tread = new THREE.Mesh(treadGeo, topMat);
    tread.position.set(x, topY - 0.0225, 0);
    tread.receiveShadow = true;
    group.add(tread);

    // Ön kenar neon ışık şeridi
    const trimGeo = track(new THREE.BoxGeometry(STAIR_DX + 0.055, 0.028, 0.035));
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(x, topY - 0.02, 0.535);
    group.add(trim);

    steps.push({ topMat, trimMat });
  }

  // Zirve bayrağı (4. basamağın köşesinde)
  const topX = STAIR_X0 + (STAIR_COUNT - 1) * STAIR_DX + 0.26;
  const topY = (STAIR_COUNT - 1) * STAIR_RISE;

  const flagPoleMat = track(
    new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.3,
      metalness: 0.8,
    }),
  );
  const flagMat = track(
    new THREE.MeshStandardMaterial({
      color: '#475569',
      emissive: '#2ee6b8',
      emissiveIntensity: 0.1,
      roughness: 0.3,
      metalness: 0.3,
    }),
  );

  const poleGeo = track(new THREE.CylinderGeometry(0.022, 0.026, 0.95, 12));
  const pole = new THREE.Mesh(poleGeo, flagPoleMat);
  pole.position.set(topX, topY + 0.475, -0.34);
  pole.castShadow = true;
  group.add(pole);

  const flagGeo = track(new THREE.ConeGeometry(0.14, 0.32, 4));
  const flagMesh = new THREE.Mesh(flagGeo, flagMat);
  flagMesh.rotation.z = -Math.PI / 2;
  flagMesh.position.set(topX + 0.14, topY + 0.82, -0.34);
  group.add(flagMesh);

  return {
    group,
    steps,
    flagPoleMat,
    flagMesh,
    flagMat,
    disposables,
  };
}
