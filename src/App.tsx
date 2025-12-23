import { useState, useMemo, useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  PerspectiveCamera,
  shaderMaterial,
  Float,
  Stars,
  Sparkles,
  useTexture
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { MathUtils } from 'three';
import * as random from 'maath/random';


// --- 动态生成照片列表（只使用三张照片并循环） ---
// 只保留三张：1.jpg, 2.jpg, 3.jpg。 PhotoOrnaments 会基于 textures.length 循环使用这些图像。
const bodyPhotoPaths = [
  'photos/1.png',
  'photos/2.png',
  'photos/3.png'
];

// --- 视觉配置 ---
const CONFIG = {
  colors: {
    emerald: '#004225', // 纯正祖母绿
    gold: '#FFD700',
    silver: '#ECEFF1',
    red: '#D32F2F',
    green: '#2E7D32',
    white: '#FFFFFF',   // 纯白色
    warmLight: '#FFD54F',
    lights: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'], // 彩灯
    // 拍立得边框颜色池 (复古柔和色系)
    borders: ['#FFFAF0', '#F0E68C', '#E6E6FA', '#FFB6C1', '#98FB98', '#87CEFA', '#FFDAB9'],
    // 圣诞元素颜色
    giftColors: ['#D32F2F', '#FFD700', '#1976D2', '#2E7D32'],
    candyColors: ['#FF0000', '#FFFFFF']
  },
  counts: {
    foliage: 15000,
    ornaments: 300,   // 拍立得照片数量
    elements: 250,    // 圣诞元素数量
    lights: 400       // 彩灯数量
  },
  tree: { height: 22, radius: 9 }, // 树体尺寸
  photos: {
    // top 属性不再需要，因为已经移入 body
    body: bodyPhotoPaths
  }
};

// --- Shader Material (Foliage) ---
const FoliageMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color(CONFIG.colors.emerald), uProgress: 0 },
  `uniform float uTime; uniform float uProgress; attribute vec3 aTargetPos; attribute float aRandom;
  varying vec2 vUv; varying float vMix;
  float cubicInOut(float t) { return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0; }
  void main() {
    vUv = uv;
    vec3 noise = vec3(sin(uTime * 1.5 + position.x), cos(uTime + position.y), sin(uTime * 1.5 + position.z)) * 0.15;
    float t = cubicInOut(uProgress);
    vec3 finalPos = mix(position, aTargetPos + noise, t);
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_PointSize = (60.0 * (1.0 + aRandom)) / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
    vMix = t;
  }`,
  `uniform vec3 uColor; varying float vMix;
  void main() {
    float r = distance(gl_PointCoord, vec2(0.5)); if (r > 0.5) discard;
    vec3 finalColor = mix(uColor * 0.3, uColor * 1.2, vMix);
    gl_FragColor = vec4(finalColor, 1.0);
  }`
);
extend({ FoliageMaterial });

// --- Helper: Tree Shape ---
const getTreePosition = () => {
  const h = CONFIG.tree.height; const rBase = CONFIG.tree.radius;
  const y = (Math.random() * h) - (h / 2); const normalizedY = (y + (h/2)) / h;
  const currentRadius = rBase * (1 - normalizedY); const theta = Math.random() * Math.PI * 2;
  const r = Math.random() * currentRadius;
  return [r * Math.cos(theta), y, r * Math.sin(theta)];
};

// --- Component: Foliage ---
const Foliage = ({ progress, destroyed }: { progress: number, destroyed?: boolean }) => {
  const materialRef = useRef<any>(null);
  const { positions, targetPositions, randoms } = useMemo(() => {
    const count = CONFIG.counts.foliage;
    const positions = new Float32Array(count * 3); const targetPositions = new Float32Array(count * 3); const randoms = new Float32Array(count);
    const spherePoints = random.inSphere(new Float32Array(count * 3), { radius: 25 }) as Float32Array;
    for (let i = 0; i < count; i++) {
      positions[i*3] = spherePoints[i*3]; positions[i*3+1] = spherePoints[i*3+1]; positions[i*3+2] = spherePoints[i*3+2];
      const [tx, ty, tz] = getTreePosition();
      targetPositions[i*3] = tx; targetPositions[i*3+1] = ty; targetPositions[i*3+2] = tz;
      randoms[i] = Math.random();
    }
    return { positions, targetPositions, randoms };
  }, []);
  useFrame((rootState, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = rootState.clock.elapsedTime;
      // 正常进度混合
      materialRef.current.uProgress = MathUtils.damp(materialRef.current.uProgress ?? 0, progress, 1.5, delta);
      // 破坏时推动点云远离（将 progress 推高并加入噪声时间）
      if (destroyed) {
        materialRef.current.uProgress = MathUtils.damp(materialRef.current.uProgress, 1.8, 0.8, delta);
        materialRef.current.uTime += rootState.clock.elapsedTime * 0.5;
      }
    }
  });
  return (
    <points>
      <bufferGeometry onUpdate={(g:any) => { g.computeBoundingSphere(); }}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aTargetPos" args={[targetPositions, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
      </bufferGeometry>
      {/* @ts-ignore */}
      <foliageMaterial ref={materialRef} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

// --- Component: Photo Ornaments (Double-Sided Polaroid) ---
const PhotoOrnaments = ({ progress, destroyed }: { progress: number, destroyed?: boolean }) => {
  const textures = useTexture(CONFIG.photos.body);
  const count = CONFIG.counts.ornaments;
  const groupRef = useRef<THREE.Group>(null);

  // 预生成并缓存纹理材质，避免每次渲染创建新材质
  const materials = useMemo(() => textures.map(tex => new THREE.MeshStandardMaterial({
    map: tex, roughness: 0.5, metalness: 0, emissive: CONFIG.colors.white, emissiveMap: tex, emissiveIntensity: 1.0, side: THREE.FrontSide
  })), [textures]);

  const borderMaterialCacheRef = useRef<Map<string, THREE.MeshStandardMaterial>>(new Map());

  const borderGeometry = useMemo(() => new THREE.PlaneGeometry(1.2, 1.5), []);
  const photoGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const data = useMemo(() => {
    const cache = borderMaterialCacheRef.current;
    return new Array(count).fill(0).map((_, i) => {
      const chaosPos = new THREE.Vector3((Math.random()-0.5)*70, (Math.random()-0.5)*70, (Math.random()-0.5)*70);
      const h = CONFIG.tree.height; const y = (Math.random() * h) - (h / 2);
      const rBase = CONFIG.tree.radius;
      const currentRadius = (rBase * (1 - (y + (h/2)) / h)) + 0.5;
      const theta = Math.random() * Math.PI * 2;
      const targetPos = new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));

      const isBig = Math.random() < 0.2;
      const baseScale = isBig ? 2.2 : 0.8 + Math.random() * 0.6;
      const weight = 0.8 + Math.random() * 1.2;
      const borderColor = CONFIG.colors.borders[Math.floor(Math.random() * CONFIG.colors.borders.length)];

      const rotationSpeed = {
        x: (Math.random() - 0.5) * 1.0,
        y: (Math.random() - 0.5) * 1.0,
        z: (Math.random() - 0.5) * 1.0
      };
      const chaosRotation = new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);

      const borderMaterial = cache.get(borderColor) ?? (() => { const m = new THREE.MeshStandardMaterial({ color: borderColor, roughness: 0.9, metalness: 0, side: THREE.FrontSide }); cache.set(borderColor, m); return m; })();

      // 为破坏效果预生成爆散方向与速度
      const explodeDir = new THREE.Vector3((Math.random()-0.5), (Math.random()-0.2), (Math.random()-0.5)).normalize();
      const explodeSpeed = 25 + Math.random() * 60;
      return {
        chaosPos, targetPos, scale: baseScale, weight,
        textureIndex: i % textures.length,
        borderColor,
        borderMaterial,
        currentPos: chaosPos.clone(),
        chaosRotation,
        rotationSpeed,
        wobbleOffset: Math.random() * 10,
        wobbleSpeed: 0.5 + Math.random() * 0.5,
        clicked: false,
        clickProgress: 0,
        tmp: new THREE.Vector3(),
        explodeDir,
        explodeSpeed
      };
    });
  }, [textures, count]);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const time = stateObj.clock.elapsedTime;

    groupRef.current.children.forEach((group, i) => {
      const objData = data[i];
      // 将位置基于 progress 做平滑插值
      const target = objData.targetPos.clone().lerp(objData.chaosPos, 1 - progress);

      objData.currentPos.lerp(target, MathUtils.damp(0, 1, 5.0, delta) * (0.9 + objData.weight * 0.1));
      group.position.copy(objData.currentPos);

      // 点击动画（局部 scale 动画）
      if (objData.clicked) {
        objData.clickProgress = Math.min(1, objData.clickProgress + delta * 3);
        const clickScale = objData.scale * (1 + 0.6 * Math.sin(objData.clickProgress * Math.PI));
        group.scale.set(clickScale, clickScale, clickScale);
        if (objData.clickProgress >= 1) { objData.clicked = false; objData.clickProgress = 0; }
      } else {
        group.scale.lerp(new THREE.Vector3(objData.scale, objData.scale, objData.scale), delta * 4);
      }

      // 破坏时的爆散逻辑（优先于正常行为）
      if (destroyed) {
        // 按 explodeDir 推动并随机旋转
        group.position.addScaledVector(objData.explodeDir, objData.explodeSpeed * delta);
        group.rotation.x += delta * objData.rotationSpeed.x * 3;
        group.rotation.y += delta * objData.rotationSpeed.y * 3;
        group.rotation.z += delta * objData.rotationSpeed.z * 3;
        // 同时减小 scale
        const s = Math.max(0, group.scale.x - delta * 0.6);
        group.scale.set(s, s, s);
        return; // 跳过常规摆动/对齐逻辑
      }

      // 旋转与微摆动基于 progress 混合
      const wobbleX = Math.sin(time * objData.wobbleSpeed + objData.wobbleOffset) * 0.05 * progress;
      const wobbleZ = Math.cos(time * objData.wobbleSpeed * 0.8 + objData.wobbleOffset) * 0.05 * progress;
      group.rotation.x = MathUtils.damp(group.rotation.x, wobbleX, 4, delta);
      group.rotation.z = MathUtils.damp(group.rotation.z, wobbleZ, 4, delta);

      // 当接近完成时，让照片面向一个更“树心”的方向
      if (progress > 0.6) {
        const targetLookPos = new THREE.Vector3(group.position.x * 2, group.position.y + 0.5, group.position.z * 2);
        group.lookAt(targetLookPos);
      }

    });
  });

  const handleClick = (e: any, i: number) => {
    e.stopPropagation();
    const obj = data[i];
    obj.clicked = true; obj.clickProgress = 0;
    // 不再打开图片，保留点击反馈动画
  };

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => (
        <group key={i} scale={[obj.scale, obj.scale, obj.scale]} rotation={[0,0,0]}>
          {/* 正面 */}
          <group position={[0, 0, 0.015]}>
            <mesh geometry={photoGeometry} onClick={(e:any) => handleClick(e, i)} material={materials[obj.textureIndex]} castShadow={false} receiveShadow={false} />
            <mesh geometry={borderGeometry} position={[0, -0.15, -0.01]} material={obj.borderMaterial} castShadow={false} receiveShadow={false} />
          </group>
          {/* 背面 */}
          <group position={[0, 0, -0.015]} rotation={[0, Math.PI, 0]}>
            <mesh geometry={photoGeometry} material={materials[obj.textureIndex]} castShadow={false} receiveShadow={false} />
            <mesh geometry={borderGeometry} position={[0, -0.15, -0.01]} material={obj.borderMaterial} castShadow={false} receiveShadow={false} />
          </group>
        </group>
      ))}
    </group>
  );
};

// --- Component: Christmas Elements ---
const ChristmasElements = ({ progress, destroyed }: { progress: number, destroyed?: boolean }) => {
  const count = CONFIG.counts.elements;
  const groupRef = useRef<THREE.Group>(null);

  const boxGeometry = useMemo(() => new THREE.BoxGeometry(0.8, 0.8, 0.8), []);
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 16, 16), []);
  const caneGeometry = useMemo(() => new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8), []);

  const elementMaterialCacheRef = useRef<Map<string, THREE.MeshStandardMaterial>>(new Map());
  const tmpScaleRef = useRef(new THREE.Vector3());

  const data = useMemo(() => {
    const cache = elementMaterialCacheRef.current;
    return new Array(count).fill(0).map(() => {
      const chaosPos = new THREE.Vector3((Math.random()-0.5)*60, (Math.random()-0.5)*60, (Math.random()-0.5)*60);
      const h = CONFIG.tree.height;
      const y = (Math.random() * h) - (h / 2);
      const rBase = CONFIG.tree.radius;
      const currentRadius = (rBase * (1 - (y + (h/2)) / h)) * 0.95;
      const theta = Math.random() * Math.PI * 2;

      const targetPos = new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));

      const type = Math.floor(Math.random() * 3);
      let color; let scale = 1;
      if (type === 0) { color = CONFIG.colors.giftColors[Math.floor(Math.random() * CONFIG.colors.giftColors.length)]; scale = 0.8 + Math.random() * 0.4; }
      else if (type === 1) { color = CONFIG.colors.giftColors[Math.floor(Math.random() * CONFIG.colors.giftColors.length)]; scale = 0.6 + Math.random() * 0.4; }
      else { color = Math.random() > 0.5 ? CONFIG.colors.red : CONFIG.colors.white; scale = 0.7 + Math.random() * 0.3; }

      const rotationSpeed = { x: (Math.random()-0.5)*2.0, y: (Math.random()-0.5)*2.0, z: (Math.random()-0.5)*2.0 };
      const material = cache.get(color) ?? (() => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.4, emissive: color, emissiveIntensity: 0.2 }); cache.set(color, m); return m; })();
      const explodeDir = new THREE.Vector3((Math.random()-0.5), (Math.random()-0.2), (Math.random()-0.5)).normalize();
      const explodeSpeed = 20 + Math.random() * 70;
      return { type, chaosPos, targetPos, color, scale, currentPos: chaosPos.clone(), chaosRotation: new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI), rotationSpeed, tmp: new THREE.Vector3(), material, explodeDir, explodeSpeed };
    });
  }, [boxGeometry, sphereGeometry, caneGeometry, count]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const objData = data[i];
      // 破坏行为覆盖常规行为
      if (destroyed) {
        mesh.position.addScaledVector(objData.explodeDir, objData.explodeSpeed * delta);
        mesh.rotation.x += delta * objData.rotationSpeed.x * 3; mesh.rotation.y += delta * objData.rotationSpeed.y * 3; mesh.rotation.z += delta * objData.rotationSpeed.z * 3;
        mesh.scale.lerp(new THREE.Vector3(0.01,0.01,0.01), delta * 1.5);
        if (mesh.material !== objData.material) mesh.material = objData.material;
        return;
      }
      // 根据 progress 混合位置（使用预分配 tmp）
      objData.tmp.copy(objData.targetPos).lerp(objData.chaosPos, 1 - progress);
      objData.currentPos.lerp(objData.tmp, delta * 1.5);
      mesh.position.copy(objData.currentPos);
      mesh.rotation.x += delta * objData.rotationSpeed.x; mesh.rotation.y += delta * objData.rotationSpeed.y; mesh.rotation.z += delta * objData.rotationSpeed.z;
      // 缩放基于 progress（重用 tmpScaleRef 避免每帧创建向量）
      const s = objData.scale * (0.5 + progress);
      tmpScaleRef.current.set(s, s, s);
      mesh.scale.lerp(tmpScaleRef.current, delta * 4);
      if (mesh.material !== objData.material) mesh.material = objData.material;
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => {
        let geometry; if (obj.type === 0) geometry = boxGeometry; else if (obj.type === 1) geometry = sphereGeometry; else geometry = caneGeometry;
        return ( <mesh key={i} scale={[obj.scale, obj.scale, obj.scale]} geometry={geometry} rotation={obj.chaosRotation} material={obj.material} castShadow={false} receiveShadow={false} /> )})}
    </group>
  );
};

// --- Component: Fairy Lights ---
const FairyLights = ({ progress, destroyed }: { progress: number, destroyed?: boolean }) => {
  const count = CONFIG.counts.lights;
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => new THREE.SphereGeometry(0.8, 8, 8), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = new THREE.Vector3((Math.random()-0.5)*60, (Math.random()-0.5)*60, (Math.random()-0.5)*60);
      const h = CONFIG.tree.height; const y = (Math.random() * h) - (h / 2); const rBase = CONFIG.tree.radius;
      const currentRadius = (rBase * (1 - (y + (h/2)) / h)) + 0.3; const theta = Math.random() * Math.PI * 2;
      const targetPos = new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));
      const color = CONFIG.colors.lights[Math.floor(Math.random() * CONFIG.colors.lights.length)];
      const speed = 2 + Math.random() * 3;
      const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0, toneMapped: false });
      const explodeDir = new THREE.Vector3((Math.random()-0.5), (Math.random()-0.2), (Math.random()-0.5)).normalize();
      const explodeSpeed = 15 + Math.random() * 50;
      return { chaosPos, targetPos, color, speed, currentPos: chaosPos.clone(), timeOffset: Math.random() * 100, material, tmp: new THREE.Vector3(), explodeDir, explodeSpeed };
    });
  }, []);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const time = stateObj.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const objData = data[i];
      objData.tmp.copy(objData.targetPos).lerp(objData.chaosPos, 1 - progress);
      objData.currentPos.lerp(objData.tmp, delta * 2.0);
      const mesh = child as THREE.Mesh;
      mesh.position.copy(objData.currentPos);
      const intensity = (Math.sin(time * objData.speed + objData.timeOffset) + 1) / 2;
      if (destroyed) {
        // 爆散效果（复用上方的 mesh 变量）
        mesh.position.addScaledVector(objData.explodeDir, objData.explodeSpeed * delta);
        objData.material.emissiveIntensity = 0;
        if (mesh.material !== objData.material) mesh.material = objData.material;
        return;
      }
      // 更新 material 而不是访问 mesh.material（保证一致性）
      objData.material.emissiveIntensity = progress ? 3 * progress + intensity * 4 * progress : 0;
      if (mesh.material !== objData.material) mesh.material = objData.material;
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => ( <mesh key={i} scale={[0.15, 0.15, 0.15]} geometry={geometry} material={obj.material}>
          {/* material created and owned in data for predictable updates */}
        </mesh> ))}
    </group>
  );
};

// --- Component: Top Star (No Photo, Pure Gold 3D Star) ---
const TopStar = ({ progress, destroyed }: { progress: number, destroyed?: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);

  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.3; const innerRadius = 0.7; const points = 5;
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      i === 0 ? shape.moveTo(radius*Math.cos(angle), radius*Math.sin(angle)) : shape.lineTo(radius*Math.cos(angle), radius*Math.sin(angle));
    }
    shape.closePath();
    return shape;
  }, []);

  const starGeometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(starShape, {
      depth: 0.4, // 增加一点厚度
      bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3,
    });
  }, [starShape]);

  // 纯金材质
  const goldMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: CONFIG.colors.gold,
    emissive: CONFIG.colors.gold,
    emissiveIntensity: 1.5, // 适中亮度，既发光又有质感
    roughness: 0.1,
    metalness: 1.0,
  }), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (destroyed) {
      // 破坏时星星掉落并碎裂（表现为快速旋转并缩小）
      groupRef.current.rotation.x += delta * 8;
      groupRef.current.rotation.y += delta * 6;
      groupRef.current.position.y -= delta * 12;
      groupRef.current.scale.lerp(new THREE.Vector3(0.01, 0.01, 0.01), delta * 4);
      return;
    }
    groupRef.current.rotation.y += delta * 0.5;
    const targetScale = progress;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 3);
  });

  return (
    <group ref={groupRef} position={[0, CONFIG.tree.height / 2 + 1.8, 0]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh geometry={starGeometry} material={goldMaterial} />
      </Float>
    </group>
  );
};

// --- Main Scene Experience ---
const Experience = ({ assemblyProgress, setAssemblyProgress, rotationSpeed }: { assemblyProgress: number, setAssemblyProgress: (p:number) => void, rotationSpeed: number }) => {
  const controlsRef = useRef<any>(null);
  const progressRef = useRef<number>(assemblyProgress);
  // 用于检测摄像机距离变化方向与平滑应用 zoom speed 的缓存
  const prevDistanceRef = useRef<number | null>(null);
  const zoomSpeedRef = useRef<number>(1.0);

  // ---- 新：放大阻尼与破坏（explosion） ----
  const zoomVelocityRef = useRef<number>(0); // positive -> zoom out, negative -> zoom in
  const initialPinchDistanceRef = useRef<number | null>(null);
  const destructionChargeRef = useRef<number>(0);
  const [destroyed, setDestroyed] = useState(false);

  // 可调参数（可后面暴露为 UI）
  const ZOOM_RESISTANCE = 0.06; // 数值越小阻力越明显
  const ZOOM_SENSITIVITY = 0.5; // 缩放灵敏度变换
  const DESTRUCTION_THRESHOLD = 120; // charge 达到阈值触发破坏
  const DESTRUCTION_CHARGE_RATE = 45; // 每单位缩放速度积累多少 charge
  const CHARGE_DECAY = 40; // 每秒 decay

  // 全局临时向量
  const tmpDirection = new THREE.Vector3();

  // 绑定全局 wheel/pinch 事件以统一控制缩放和阻尼
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      // 只处理主要滚轮，手动阻止默认 zoom 行为
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      // 负 delta 表示向上滚（页面向上） => 通常是放大（zoom in），我们使用 -delta
      const zoomDelta = -delta * Math.abs(e.deltaY) * 0.003 * ZOOM_SENSITIVITY * ZOOM_RESISTANCE;
      zoomVelocityRef.current += zoomDelta;
      // 当方向是放大 (zoomDelta < 0)，为破坏 charge 累加
      if (zoomDelta < 0) {
        destructionChargeRef.current += -zoomDelta * DESTRUCTION_CHARGE_RATE;
      }
    };

    let touchHandlerAttached = false;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length === 2) {
        initialPinchDistanceRef.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length === 2 && initialPinchDistanceRef.current) {
        e.preventDefault();
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = d - initialPinchDistanceRef.current; // 正表示张开（zoom out）
        // 反向为放大
        const zoomDelta = - (delta * 0.002) * ZOOM_SENSITIVITY * ZOOM_RESISTANCE;
        zoomVelocityRef.current += zoomDelta;
        initialPinchDistanceRef.current = d;
        if (zoomDelta < 0) destructionChargeRef.current += -zoomDelta * DESTRUCTION_CHARGE_RATE;
      }
    };
    const onTouchEnd = (e: TouchEvent) => { if (!e.touches || e.touches.length < 2) initialPinchDistanceRef.current = null; };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    touchHandlerAttached = true;

    return () => {
      window.removeEventListener('wheel', onWheel);
      if (touchHandlerAttached) {
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      }
    };
  }, []);

  useFrame((state, delta) => {
    // 根据摄像机与树心距离映射为进度（0..1），更靠近视为组装
    const cam = state.camera;
    const treeCenter = new THREE.Vector3(0, -6, 0);
    const d = cam.position.distanceTo(treeCenter);
    const minD = 30; const maxD = 120; // 对应 OrbitControls 的范围
    const raw = 1 - (d - minD) / (maxD - minD);
    const clamped = MathUtils.clamp(raw, 0, 1);
    // 反转映射：放大（更近，相机距离小） => 散开（progress 低）
    const inverted = 1 - clamped;

    // 阻力与瞬间完成逻辑：在接近两端时增加阻力，且在越过阈值时快速“跳到”终点
    const RESISTANCE_START = 0.85;
    const SNAP_THRESHOLD = 0.98;
    const SOFT_CAP = 0.95;
    let newProgress = progressRef.current;

    if (inverted >= SNAP_THRESHOLD) {
      // 快速跳向 1
      newProgress = MathUtils.damp(progressRef.current, 1, 10, delta);
      if (newProgress > 0.999) newProgress = 1;
    } else if (inverted >= RESISTANCE_START) {
      // 进入阻力区，先慢慢推进到一个软上限
      const softened = Math.min(inverted, SOFT_CAP);
      newProgress = MathUtils.damp(progressRef.current, softened, 1.0, delta);
    } else if (inverted <= (1 - SNAP_THRESHOLD)) {
      // 快速跳向 0
      newProgress = MathUtils.damp(progressRef.current, 0, 10, delta);
      if (newProgress < 0.001) newProgress = 0;
    } else if (inverted <= (1 - RESISTANCE_START)) {
      // 低端阻力
      const softenedLow = Math.max(inverted, 1 - SOFT_CAP);
      newProgress = MathUtils.damp(progressRef.current, softenedLow, 1.0, delta);
    } else {
      // 正常平滑过渡
      newProgress = MathUtils.damp(progressRef.current, inverted, 4, delta);
    }

    progressRef.current = newProgress;
    setAssemblyProgress(newProgress);

    // 在这里加入 zoomVelocity 的应用（移动相机）以及破坏检测
    try {
      // 将 zoomVelocity 应用于摄像机：正值 -> 后退(zoom out)，负值 -> 前进(zoom in)
      if (Math.abs(zoomVelocityRef.current) > 1e-4) {
        const cam = state.camera;
        cam.getWorldDirection(tmpDirection);
        // 缩放速度控制；乘以一个常数以调节感受
        const applied = zoomVelocityRef.current * 60 * delta;
        cam.position.addScaledVector(tmpDirection, applied);
        // 逐步衰减 zoom velocity（阻尼）
        zoomVelocityRef.current = MathUtils.damp(zoomVelocityRef.current, 0, 6, delta);
      }

      // 破坏 charge 随时间衰减
      if (destructionChargeRef.current > 0) {
        destructionChargeRef.current = Math.max(0, destructionChargeRef.current - CHARGE_DECAY * delta);
      }

      // 当 charge 超过阈值并且还未触发破坏，触发一次
      if (!destroyed && destructionChargeRef.current >= DESTRUCTION_THRESHOLD) {
        setDestroyed(true);
      }

      if (controlsRef.current) {
        const EDGE_THRESHOLD = 0.15; // 当距离端点小于此值开始出现阻力
        const MIN_ZOOM_SPEED = 0.02; // 更强的最小 zoom speed（更强阻力）
        const MAX_ZOOM_SPEED = 1.0;  // 默认最大 zoom speed
        const edgeDist = Math.min(progressRef.current, 1 - progressRef.current);
        const tEdge = Math.max(0, (EDGE_THRESHOLD - edgeDist) / EDGE_THRESHOLD);
        // 使用 ease (平方) 让阻力更平滑
        const ease = tEdge * tEdge;

        // 基础目标 zoom speed（两端阻力）
        let targetZoomSpeed = THREE.MathUtils.lerp(MAX_ZOOM_SPEED, MIN_ZOOM_SPEED, ease);

        // 判断摄像机当前是否在靠近树心（放大）方向，给放大方向额外阻力
        const lastD = prevDistanceRef.current ?? d;
        const deltaD = d - lastD; // 负值表示正在靠近（放大）
        prevDistanceRef.current = d;

        if (deltaD < 0) {
          // 放大方向：根据靠近速度和 ease 加强阻力（非线性缩放）
          const extraFactor = THREE.MathUtils.clamp(1 - Math.abs(deltaD) * 0.45, 0.12, 1.0);
          // 使用 ease 加权应用额外阻力，使边缘处更明显
          targetZoomSpeed *= THREE.MathUtils.lerp(1.0, extraFactor, ease);
        }

        // 平滑过渡到目标 zoom speed，避免突变
        zoomSpeedRef.current = MathUtils.damp(zoomSpeedRef.current, targetZoomSpeed, 6, delta);
        controlsRef.current.zoomSpeed = Math.max(0.02, zoomSpeedRef.current);
      }
    } catch (err) {
      // ignore if controls not ready
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 8, 60]} fov={45} />
      <OrbitControls ref={controlsRef} enablePan={false} enableZoom={true} minDistance={30} maxDistance={120} autoRotate={rotationSpeed === 0 && assemblyProgress > 0.9} autoRotateSpeed={0.3} maxPolarAngle={Math.PI / 1.7} />

      <color attach="background" args={['#000300']} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="night" background={false} />

      <ambientLight intensity={0.4} color="#003311" />
      <pointLight position={[30, 30, 30]} intensity={100} color={CONFIG.colors.warmLight} />
      <pointLight position={[-30, 10, -30]} intensity={50} color={CONFIG.colors.gold} />
      <pointLight position={[0, -20, 10]} intensity={30} color="#ffffff" />

      <group position={[0, -6, 0]}>
        <Foliage progress={assemblyProgress} destroyed={destroyed} />
        <Suspense fallback={null}>
           <PhotoOrnaments progress={assemblyProgress} destroyed={destroyed} />
           <ChristmasElements progress={assemblyProgress} destroyed={destroyed} />
           <FairyLights progress={assemblyProgress} destroyed={destroyed} />
           <TopStar progress={assemblyProgress} destroyed={destroyed} />
        </Suspense>
        <Sparkles count={600} scale={50} size={8} speed={0.4} opacity={0.4} color={CONFIG.colors.silver} />
      </group>

      <EffectComposer>
        <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.1} intensity={1.5} radius={0.5} mipmapBlur />
        <Vignette eskil={false} offset={0.1} darkness={1.2} />
      </EffectComposer>
    </>
  );
};



// --- App Entry ---
export default function GrandTreeApp() {
  // 现在用 continuous progress 来驱动组装，取代简单的离散 state
  const [assemblyProgress, setAssemblyProgress] = useState<number>(0);
  const [rotationSpeed] = useState(0);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <Canvas dpr={[1, 2]} gl={{ toneMapping: THREE.ReinhardToneMapping }} shadows>
            <Experience assemblyProgress={assemblyProgress} setAssemblyProgress={setAssemblyProgress} rotationSpeed={rotationSpeed} />
        </Canvas>
      </div>



      {/* 居中文字：提示当前交互（居中） */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 12 }}>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18, fontWeight: 600, padding: '8px 14px', background: 'rgba(0,0,0,0.35)', borderRadius: 8 }}>
          test text
        </div>
      </div>

      {/* UI - AI Status */}

    </div>
  );
}