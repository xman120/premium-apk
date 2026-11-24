import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Layers,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

type FinishPreset = 'obsidian' | 'gold' | 'emerald';
type CameraPreset = 'hero' | 'profile' | 'blueprint';

interface Home3DStageProps {
  storeTitle: string;
  storeTagline: string;
  totalAppsCount: number;
  isDark: boolean;
  onExploreCatalog: () => void;
  onQuickFeatured: () => void;
}

const _vec3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createProceduralScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 512, 1024);
    grad.addColorStop(0, '#070B14');
    grad.addColorStop(0.5, '#0F172A');
    grad.addColorStop(1, '#064E3B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 1024);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.48)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(256, 420, 130, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(256, 420, 168, 0.4, Math.PI * 1.75);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(56, 650, 400, 96);
    ctx.fillRect(56, 770, 400, 96);

    ctx.fillStyle = '#10B981';
    ctx.fillRect(76, 678, 120, 12);
    ctx.fillStyle = 'rgba(248, 250, 252, 0.72)';
    ctx.fillRect(76, 704, 240, 8);

    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(76, 798, 140, 12);
    ctx.fillStyle = 'rgba(248, 250, 252, 0.72)';
    ctx.fillRect(76, 824, 210, 8);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
    grad.addColorStop(0, 'rgba(2, 6, 23, 0.6)');
    grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.22)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

export const Home3DStage: React.FC<Home3DStageProps> = ({
  storeTitle,
  storeTagline,
  totalAppsCount,
  isDark,
  onExploreCatalog,
  onQuickFeatured,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [finish, setFinish] = useState<FinishPreset>('obsidian');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('hero');
  const [exploded, setExploded] = useState<number>(0.18);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const finishRef = useRef<FinishPreset>(finish);
  const cameraPresetRef = useRef<{ preset: CameraPreset; version: number }>({
    preset: cameraPreset,
    version: 0,
  });
  const explodedRef = useRef<number>(exploded);
  const darkRef = useRef<boolean>(isDark);

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  useEffect(() => {
    explodedRef.current = exploded;
  }, [exploded]);

  useEffect(() => {
    darkRef.current = isDark;
  }, [isDark]);

  const handleSelectCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    cameraPresetRef.current = {
      preset,
      version: cameraPresetRef.current.version + 1,
    };
  };

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const getStageSize = () => ({
      width: Math.max(280, container.clientWidth),
      height: Math.max(280, container.clientHeight),
      isMobileLayout: window.innerWidth < 1024,
    });

    const initial = getStageSize();
    renderer.setSize(initial.width, initial.height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initialBg = darkRef.current ? 0x070b14 : 0xf1f5f9;
    scene.background = new THREE.Color(initialBg);
    scene.fog = new THREE.FogExp2(initialBg, 0.045);

    const camera = new THREE.PerspectiveCamera(
      initial.isMobileLayout ? 42 : 40,
      initial.width / initial.height,
      0.1,
      80
    );
    camera.position.set(
      initial.isMobileLayout ? 2.4 : 3.2,
      initial.isMobileLayout ? 1.25 : 1.55,
      initial.isMobileLayout ? 5.9 : 5.1
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.target.set(
      initial.isMobileLayout ? 0 : -0.35,
      initial.isMobileLayout ? 0.05 : 0.25,
      0
    );
    controls.update();

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.3);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xc7d2fe, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x10b981, 1.45);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    const baseX = initial.isMobileLayout ? 0 : 0.75;

    const plinthGeo = new THREE.CylinderGeometry(2.35, 2.55, 0.24, 64);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.65,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.set(baseX, -1.62, 0);
    plinth.receiveShadow = true;
    scene.add(plinth);

    const plinthRingGeo = new THREE.TorusGeometry(2.36, 0.025, 12, 72);
    const goldAccentMat = new THREE.MeshPhysicalMaterial({
      color: 0xd97706,
      metalness: 0.94,
      roughness: 0.16,
      clearcoat: 0.6,
    });
    const plinthRing = new THREE.Mesh(plinthRingGeo, goldAccentMat);
    plinthRing.rotation.x = Math.PI / 2;
    plinthRing.position.set(baseX, -1.49, 0);
    scene.add(plinthRing);

    const shadowTex = createContactShadowTexture();
    const shadowPlaneGeo = new THREE.PlaneGeometry(4.2, 4.2);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(baseX, -1.47, 0);
    scene.add(shadowPlane);

    const heroGroup = new THREE.Group();
    heroGroup.position.set(baseX, 0.15, 0);
    scene.add(heroGroup);

    const chassisShape = new THREE.Shape();
    const w = 0.88;
    const h = 1.76;
    const r = 0.16;
    chassisShape.moveTo(-w + r, -h);
    chassisShape.lineTo(w - r, -h);
    chassisShape.quadraticCurveTo(w, -h, w, -h + r);
    chassisShape.lineTo(w, h - r);
    chassisShape.quadraticCurveTo(w, h, w - r, h);
    chassisShape.lineTo(-w + r, h);
    chassisShape.quadraticCurveTo(-w, h, -w, h - r);
    chassisShape.lineTo(-w, -h + r);
    chassisShape.quadraticCurveTo(-w, -h, -w + r, -h);

    const chassisGeo = new THREE.ExtrudeGeometry(chassisShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.03,
      bevelSegments: 4,
    });
    chassisGeo.center();

    const chassisMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      metalness: 0.92,
      roughness: 0.18,
      anisotropy: 0.75,
      clearcoat: 0.4,
    });
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    chassisMesh.castShadow = true;
    heroGroup.add(chassisMesh);

    const backPlateGeo = new THREE.BoxGeometry(1.62, 3.36, 0.04);
    const backPlateMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b1120,
      metalness: 0.3,
      roughness: 0.08,
      clearcoat: 1.0,
    });
    const backPlate = new THREE.Mesh(backPlateGeo, backPlateMat);
    backPlate.position.z = -0.11;
    heroGroup.add(backPlate);

    const screenTex = createProceduralScreenTexture();
    screenTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const screenGeo = new THREE.PlaneGeometry(1.62, 3.36);
    const screenMat = new THREE.MeshPhysicalMaterial({
      map: screenTex,
      roughness: 0.12,
      metalness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      emissive: 0x064e3b,
      emissiveIntensity: 0.35,
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.z = 0.12;
    heroGroup.add(screenMesh);

    const glassGeo = new THREE.BoxGeometry(1.66, 3.4, 0.025);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.04,
      transmission: isSoftwareGl ? 0 : 0.85,
      transparent: true,
      opacity: isSoftwareGl ? 0.28 : 1,
      ior: 1.52,
      thickness: 0.25,
      depthWrite: false,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.renderOrder = 3;
    glassMesh.position.z = 0.22;
    heroGroup.add(glassMesh);

    const cameraHousingGeo = new THREE.CylinderGeometry(0.32, 0.34, 0.09, 32);
    const cameraHousing = new THREE.Mesh(cameraHousingGeo, goldAccentMat);
    cameraHousing.rotation.x = Math.PI / 2;
    cameraHousing.position.set(0.35, 1.05, -0.15);
    heroGroup.add(cameraHousing);

    const prismGeo = new THREE.OctahedronGeometry(0.38, 0);
    const prismMat = new THREE.MeshPhysicalMaterial({
      color: 0x059669,
      metalness: 0.2,
      roughness: 0.08,
      clearcoat: 1.0,
      emissive: 0x047857,
      emissiveIntensity: 0.45,
    });
    const prismMesh = new THREE.Mesh(prismGeo, prismMat);
    prismMesh.position.set(0, 0.15, 0.52);
    heroGroup.add(prismMesh);

    const outerGyroGeo = new THREE.TorusGeometry(1.55, 0.028, 16, 80);
    const outerGyro = new THREE.Mesh(outerGyroGeo, goldAccentMat);
    outerGyro.rotation.x = Math.PI * 0.32;
    heroGroup.add(outerGyro);

    const innerGyroGeo = new THREE.TorusGeometry(1.22, 0.022, 16, 72);
    const innerGyroMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      metalness: 0.85,
      roughness: 0.2,
    });
    const innerGyro = new THREE.Mesh(innerGyroGeo, innerGyroMat);
    innerGyro.rotation.y = Math.PI * 0.25;
    heroGroup.add(innerGyro);

    const shardCount = 28;
    const shardGeo = new THREE.OctahedronGeometry(0.065, 0);
    const shardMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.75,
      roughness: 0.2,
    });
    const shardInstanced = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
    shardInstanced.frustumCulled = false;

    const shardData: Array<{
      radius: number;
      angleOffset: number;
      speed: number;
      yBase: number;
      scale: number;
    }> = [];
    const palette = [
      new THREE.Color(0x10b981),
      new THREE.Color(0xf59e0b),
      new THREE.Color(0x3b82f6),
    ];

    for (let i = 0; i < shardCount; i++) {
      const rOrbit = 1.7 + (i % 5) * 0.26;
      shardData.push({
        radius: rOrbit,
        angleOffset: (i / shardCount) * Math.PI * 2,
        speed: 0.22 + (i % 4) * 0.08,
        yBase: ((i % 7) - 3) * 0.36,
        scale: 0.75 + (i % 3) * 0.25,
      });
      shardInstanced.setColorAt(i, palette[i % palette.length]);
    }
    if (shardInstanced.instanceColor) {
      shardInstanced.instanceColor.needsUpdate = true;
    }
    shardInstanced.computeBoundingSphere();
    heroGroup.add(shardInstanced);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let lastHandledPresetVersion = cameraPresetRef.current.version;
    let cameraTransitionActive = false;
    let currentMobileLayout = initial.isMobileLayout;

    const handleControlStart = () => {
      cameraTransitionActive = false;
    };
    controls.addEventListener('start', handleControlStart);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const handleResize = () => {
      if (!container) return;
      const next = getStageSize();
      currentMobileLayout = next.isMobileLayout;
      const xShift = next.isMobileLayout ? 0 : 0.75;
      plinth.position.x = xShift;
      plinthRing.position.x = xShift;
      shadowPlane.position.x = xShift;
      heroGroup.position.x = xShift;
      controls.target.set(next.isMobileLayout ? 0 : -0.35, next.isMobileLayout ? 0.05 : 0.25, 0);

      camera.fov = next.isMobileLayout ? 42 : 40;
      camera.aspect = next.width / next.height;
      camera.updateProjectionMatrix();
      renderer.setSize(next.width, next.height);
    };
    window.addEventListener('resize', handleResize);

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;
    let currentExploded = explodedRef.current;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      elapsed += delta;

      const targetBgHex = darkRef.current ? 0x070b14 : 0xf1f5f9;
      if ((scene.background as THREE.Color).getHex() !== targetBgHex) {
        (scene.background as THREE.Color).setHex(targetBgHex);
        if (scene.fog) {
          scene.fog.color.setHex(targetBgHex);
        }
        plinthMat.color.setHex(darkRef.current ? 0x0f172a : 0xe2e8f0);
      }

      if (finishRef.current === 'obsidian') {
        chassisMat.color.setHex(0x1e293b);
        goldAccentMat.color.setHex(0xd97706);
      } else if (finishRef.current === 'gold') {
        chassisMat.color.setHex(0xd97706);
        goldAccentMat.color.setHex(0xfef3c7);
      } else {
        chassisMat.color.setHex(0x065f46);
        goldAccentMat.color.setHex(0x34d399);
      }

      currentExploded = THREE.MathUtils.damp(
        currentExploded,
        explodedRef.current,
        6,
        delta
      );
      backPlate.position.z = -0.11 - currentExploded * 0.45;
      screenMesh.position.z = 0.12 + currentExploded * 0.25;
      glassMesh.position.z = 0.22 + currentExploded * 0.65;
      prismMesh.position.z = 0.46 + currentExploded * 1.05;
      cameraHousing.position.z = -0.15 - currentExploded * 0.65;

      heroGroup.position.y = 0.15 + Math.sin(elapsed * 1.4) * 0.08;
      heroGroup.rotation.y = Math.sin(elapsed * 0.45) * 0.18;
      prismMesh.rotation.y = elapsed * 0.9;
      prismMesh.rotation.x = Math.sin(elapsed * 0.7) * 0.3;
      outerGyro.rotation.z = elapsed * 0.35;
      innerGyro.rotation.x = elapsed * 0.48;

      for (let i = 0; i < shardCount; i++) {
        const s = shardData[i];
        const ang = s.angleOffset + elapsed * s.speed;
        _vec3.set(
          Math.cos(ang) * s.radius,
          s.yBase + Math.sin(elapsed * 1.2 + i) * 0.12,
          Math.sin(ang) * s.radius
        );
        _euler.set(elapsed + i, elapsed * 0.7, 0);
        _quat.setFromEuler(_euler);
        _scale.setScalar(s.scale);
        _mat4.compose(_vec3, _quat, _scale);
        shardInstanced.setMatrixAt(i, _mat4);
      }
      shardInstanced.instanceMatrix.needsUpdate = true;

      if (cameraPresetRef.current.version !== lastHandledPresetVersion) {
        lastHandledPresetVersion = cameraPresetRef.current.version;
        cameraTransitionActive = true;
      }
      if (cameraTransitionActive) {
        const preset = cameraPresetRef.current.preset;
        const distMult = currentMobileLayout ? 1.15 : 1.0;
        if (preset === 'hero') _vec3.set(3.0 * distMult, 1.45, 5.1 * distMult);
        else if (preset === 'profile') _vec3.set(-4.3 * distMult, 0.85, 3.6 * distMult);
        else _vec3.set(0.3, 4.9 * distMult, 2.8 * distMult);

        camera.position.x = THREE.MathUtils.damp(camera.position.x, _vec3.x, 4.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _vec3.y, 4.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _vec3.z, 4.5, delta);

        if (camera.position.distanceTo(_vec3) < 0.03) {
          cameraTransitionActive = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', handleControlStart);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      plinthGeo.dispose();
      plinthRingGeo.dispose();
      shadowPlaneGeo.dispose();
      chassisGeo.dispose();
      backPlateGeo.dispose();
      screenGeo.dispose();
      glassGeo.dispose();
      cameraHousingGeo.dispose();
      prismGeo.dispose();
      outerGyroGeo.dispose();
      innerGyroGeo.dispose();
      shardGeo.dispose();
      plinthMat.dispose();
      goldAccentMat.dispose();
      shadowPlaneMat.dispose();
      chassisMat.dispose();
      backPlateMat.dispose();
      screenMat.dispose();
      glassMat.dispose();
      prismMat.dispose();
      innerGyroMat.dispose();
      shardMat.dispose();
      screenTex.dispose();
      shadowTex.dispose();
      envTex.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <section
      aria-label="Interactive 3D Premium APK Showcase"
      className="relative w-full rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-[#F1F5F9] dark:bg-[#070B14] flex flex-col lg:block lg:min-h-[600px]"
    >
      {/* WebGL Canvas: Top stacked viewport on mobile (zero text collision), full-bleed stage on desktop */}
      <div className="relative h-[300px] sm:h-[360px] lg:absolute lg:inset-0 lg:h-full w-full">
        {!webglUnavailable ? (
          <div
            ref={canvasMountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950" />
        )}

        {/* Mobile hint badge inside canvas corner */}
        <span className="lg:hidden absolute top-3 right-3 px-2.5 py-1 rounded-md bg-white/90 dark:bg-[#0F172A]/90 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 pointer-events-none">
          Drag to orbit 3D
        </span>
      </div>

      {/* Editorial Copy & Controls */}
      <div className="relative z-10 lg:pointer-events-none max-w-[1280px] mx-auto px-5 sm:px-10 py-6 lg:py-14 flex flex-col justify-between lg:min-h-[600px]">
        <div className="max-w-xl space-y-4 lg:space-y-5 lg:pointer-events-auto">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            <ShieldCheck className="w-4 h-4 text-[#059669]" aria-hidden="true" />
            <span>Premium APK Vault</span>
            <span aria-hidden="true">·</span>
            <span>SHA-256 Verified</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{totalAppsCount} Curated Builds</span>
          </div>

          <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0B1120] dark:text-[#F8FAFC] leading-[1.1] [text-wrap:balance]">
            {storeTitle}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-md">
            {storeTagline}
          </p>

          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onExploreCatalog}
              className="h-12 px-6 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
            >
              <span>Explore Premium APKs</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onQuickFeatured}
              className="h-12 px-5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-[#0B1120] dark:text-[#F8FAFC] hover:border-[#D97706] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              Inspect Featured Build
            </button>
          </div>
        </div>

        {/* Studio Controls Dock: clean inline bar on mobile, collapsible floating dock on desktop */}
        <div className="mt-6 lg:mt-8 lg:self-center w-full max-w-[780px] lg:pointer-events-auto flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="hidden lg:inline-flex px-3.5 py-1 rounded-t-lg border border-b-0 border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-[#0F172A]/95 text-[11px] font-semibold text-slate-600 dark:text-slate-300 items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3 h-3 text-[#D97706]" aria-hidden="true" />
            <span>{dockCollapsed ? 'Show 3D Studio Controls' : 'Hide 3D Controls'}</span>
            {dockCollapsed ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {(!dockCollapsed || typeof window === 'undefined') && (
            <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] px-3.5 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shadow-sm">
              {/* Finish Swatches */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Finish
                </span>
                <div className="flex items-center gap-1.5">
                  {([
                    { id: 'obsidian', label: 'Obsidian', color: 'bg-slate-800' },
                    { id: 'gold', label: 'Brass', color: 'bg-amber-600' },
                    { id: 'emerald', label: 'Emerald', color: 'bg-emerald-600' },
                  ] as const).map((sw) => (
                    <button
                      key={sw.id}
                      type="button"
                      onClick={() => setFinish(sw.id)}
                      title={sw.label}
                      aria-label={`Select ${sw.label} finish`}
                      className={`h-8 sm:h-7 px-2.5 rounded-lg sm:rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 border cursor-pointer transition-colors whitespace-nowrap ${
                        finish === sw.id
                          ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#0B1120] dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${sw.color}`} />
                      <span>{sw.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Exploded Layer Slider */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="exploded-slider"
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap"
                >
                  Layers
                </label>
                <input
                  id="exploded-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={exploded}
                  onChange={(e) => setExploded(parseFloat(e.target.value))}
                  className="w-20 sm:w-28 accent-[#059669] cursor-pointer"
                />
              </div>

              {/* Camera Angles */}
              <div className="flex items-center gap-1.5">
                {([
                  { id: 'hero', label: 'Hero' },
                  { id: 'profile', label: 'Profile' },
                  { id: 'blueprint', label: 'Top' },
                ] as const).map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => handleSelectCameraPreset(cam.id)}
                    className={`h-8 sm:h-7 px-2.5 rounded-lg sm:rounded-md text-[11px] font-medium border cursor-pointer transition-colors whitespace-nowrap ${
                      cameraPreset === cam.id
                        ? 'border-[#059669] bg-[#059669]/10 text-[#059669]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setExploded(0.18);
                    setFinish('obsidian');
                    handleSelectCameraPreset('hero');
                  }}
                  title="Reset 3D view"
                  aria-label="Reset 3D view"
                  className="h-8 w-8 sm:h-7 sm:w-7 rounded-lg sm:rounded-md border border-slate-200 dark:border-slate-700 inline-flex items-center justify-center text-slate-500 hover:text-[#0B1120] dark:hover:text-white cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
