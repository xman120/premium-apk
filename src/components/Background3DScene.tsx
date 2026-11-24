import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Background3DSceneProps {
  isDark: boolean;
  motionEnabled: boolean;
  isAdminActive: boolean;
}

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

interface FloatingTile {
  mesh: THREE.Group;
  baseX: number;
  baseY: number;
  baseZ: number;
  rotSpeedX: number;
  rotSpeedY: number;
  driftPhase: number;
  driftAmp: number;
}

export const Background3DScene: React.FC<Background3DSceneProps> = ({
  isDark,
  motionEnabled,
  isAdminActive,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  const [webglFailed, setWebglFailed] = useState(false);

  const darkRef = useRef(isDark);
  const motionRef = useRef(motionEnabled);
  const pointerRef = useRef({ x: 0, y: 0 });
  const scrollRef = useRef(0);

  useEffect(() => {
    darkRef.current = isDark;
  }, [isDark]);

  useEffect(() => {
    motionRef.current = motionEnabled;
  }, [motionEnabled]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (isAdminActive || !motionEnabled || reducedMotion) {
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 60);
    camera.position.set(0, 0, 12);

    // Subtle geometric floating tiles + wireframe frames across depth planes
    const tileGeo = new THREE.BoxGeometry(1.55, 1.55, 0.12);
    const edgeGeo = new THREE.EdgesGeometry(tileGeo);

    const glassLightMat = new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
    });
    const glassEmeraldMat = new THREE.MeshBasicMaterial({
      color: 0x059669,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
    });
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.14,
    });
    const wireAccentMat = new THREE.LineBasicMaterial({
      color: 0x059669,
      transparent: true,
      opacity: 0.16,
    });

    const tiles: FloatingTile[] = [];
    const count = 16;

    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      const isEmerald = i % 2 === 0;
      const plane = new THREE.Mesh(tileGeo, isEmerald ? glassEmeraldMat : glassLightMat);
      const wire = new THREE.LineSegments(edgeGeo, isEmerald ? wireAccentMat : wireMat);
      group.add(plane);
      group.add(wire);

      const spreadX = ((i % 4) - 1.5) * 4.6 + (i % 3) * 0.7;
      const spreadY = (Math.floor(i / 4) - 1.5) * 3.4;
      const depthZ = -2 - (i % 5) * 2.6;
      const scale = 0.65 + (i % 4) * 0.25;

      group.position.set(spreadX, spreadY, depthZ);
      group.scale.setScalar(scale);
      group.rotation.set(i * 0.4, i * 0.6, i * 0.2);
      scene.add(group);

      tiles.push({
        mesh: group,
        baseX: spreadX,
        baseY: spreadY,
        baseZ: depthZ,
        rotSpeedX: (i % 2 === 0 ? 1 : -1) * (0.04 + (i % 3) * 0.015),
        rotSpeedY: (i % 3 === 0 ? 1 : -1) * (0.05 + (i % 4) * 0.015),
        driftPhase: i * 0.85,
        driftAmp: 0.25 + (i % 3) * 0.12,
      });
    }

    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      pointerRef.current.y = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };
    const onScroll = () => {
      scrollRef.current = window.scrollY || 0;
    };
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;

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
            frameId = window.setTimeout(cb, 90);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 90);
      }
    }

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      elapsed += delta;

      // Subtle contrast tuning per Daylight / Dark mode
      glassLightMat.opacity = darkRef.current ? 0.075 : 0.04;
      glassEmeraldMat.opacity = darkRef.current ? 0.08 : 0.045;
      wireMat.opacity = darkRef.current ? 0.16 : 0.11;
      wireAccentMat.opacity = darkRef.current ? 0.19 : 0.13;

      const targetCamX = pointerRef.current.x * 0.55;
      const targetCamY =
        -pointerRef.current.y * 0.4 - Math.min(2.5, scrollRef.current * 0.0018);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 3.2, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 3.2, delta);
      camera.lookAt(0, targetCamY * 0.3, -4);

      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        t.mesh.position.y =
          t.baseY + Math.sin(elapsed * 0.45 + t.driftPhase) * t.driftAmp;
        t.mesh.position.x =
          t.baseX + Math.cos(elapsed * 0.35 + t.driftPhase) * (t.driftAmp * 0.6);
        t.mesh.rotation.x += t.rotSpeedX * delta;
        t.mesh.rotation.y += t.rotSpeedY * delta;
      }

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
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      tileGeo.dispose();
      edgeGeo.dispose();
      glassLightMat.dispose();
      glassEmeraldMat.dispose();
      wireMat.dispose();
      wireAccentMat.dispose();
      renderer.dispose();
    };
  }, [isAdminActive, motionEnabled, reducedMotion]);

  if (isAdminActive || !motionEnabled || reducedMotion || webglFailed) {
    return null;
  }

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
    />
  );
};
