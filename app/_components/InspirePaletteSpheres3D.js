"use client";

import { useEffect, useMemo, useState, useRef } from "react";

const SPHERE_COUNT = 6;

const SPHERE_LAYOUT = [
  { x: -1.9, y: 1.05, z: 0.42 },
  { x: 0, y: 1.05, z: 0.27 },
  { x: 1.9, y: 1.05, z: 0.12 },
  { x: -1.9, y: -1.05, z: -0.02 },
  { x: 0, y: -1.05, z: -0.16 },
  { x: 1.9, y: -1.05, z: -0.31 },
];

const VERTEX_SHADER = `
attribute vec3 position;
attribute vec3 normal;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewPosition = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec3 uColor;
uniform vec3 uLightDirection;
uniform vec3 uSpecColor;
uniform float uAmbient;
uniform float uRimStrength;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(-vViewPosition);
  vec3 lightDir = normalize(uLightDirection);
  float diffuse = max(dot(normal, lightDir), 0.0);
  vec3 reflected = reflect(-lightDir, normal);
  float specular = pow(max(dot(viewDir, reflected), 0.0), 120.0);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
  float hemi = normal.y * 0.5 + 0.5;
  vec3 lifted = mix(uColor * 0.9, vec3(1.0), 0.16);
  vec3 base = lifted * (uAmbient + diffuse * 0.72 + hemi * 0.18);
  vec3 metalSpec = uSpecColor * (specular * 0.9 + fresnel * uRimStrength);
  gl_FragColor = vec4(base + metalSpec, 1.0);
}
`;

const normalizeHexColor = (value) => {
  const fallback = "64748b";
  const cleaned = String(value || "")
    .trim()
    .replace(/^#/, "");
  if (/^[a-fA-F0-9]{6}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^[a-fA-F0-9]{3}$/.test(cleaned)) {
    return cleaned
      .split("")
      .map((channel) => `${channel}${channel}`)
      .join("");
  }
  return fallback;
};

const hexToRgb = (value) => {
  const normalized = normalizeHexColor(value);
  const red = parseInt(normalized.slice(0, 2), 16) / 255;
  const green = parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = parseInt(normalized.slice(4, 6), 16) / 255;
  return [red, green, blue];
};

const buildSphereColors = (source) => {
  const colors = (source ?? []).filter(Boolean);
  if (!colors.length) {
    return Array.from({ length: SPHERE_COUNT }, () => "#64748b");
  }
  if (colors.length === SPHERE_COUNT) {
    return [...colors];
  }
  if (colors.length === 1) {
    return Array.from({ length: SPHERE_COUNT }, () => colors[0]);
  }
  return Array.from({ length: SPHERE_COUNT }, (_, index) => {
    const ratio = index / (SPHERE_COUNT - 1);
    const sampleIndex = Math.round(ratio * (colors.length - 1));
    return colors[sampleIndex];
  });
};

const readHostSize = (host) => {
  return {
    width: Math.max(host.clientWidth, 1),
    height: Math.max(host.clientHeight, 1),
  };
};

export default function InspirePaletteSpheres3D({ title, colors }) {
  const hostRef = useRef(null);
  const [renderError, setRenderError] = useState("");
  const sphereColors = useMemo(() => buildSphereColors(colors), [colors]);
  const colorSignature = sphereColors.join("|");

  useEffect(() => {
    let isDisposed = false;
    let frameId = null;
    let teardownScene = () => {};

    setRenderError("");

    const mountScene = async () => {
      const host = hostRef.current;
      if (!host) {
        return;
      }

      try {
        const { Camera, Mesh, Program, Renderer, Sphere, Transform, Vec3 } =
          await import("ogl");
        if (isDisposed || !hostRef.current) {
          return;
        }

        const renderer = new Renderer({
          alpha: true,
          antialias: true,
          dpr: Math.min(window.devicePixelRatio || 1, 2),
        });
        const { gl } = renderer;
        gl.clearColor(0, 0, 0, 0);
        gl.canvas.className = "inspire-style-library-canvas";
        host.appendChild(gl.canvas);

        const camera = new Camera(gl, { fov: 33, near: 0.1, far: 100 });
        camera.position.set(0, 0.1, 7.4);

        const scene = new Transform();
        const sphereGroup = new Transform();
        sphereGroup.setParent(scene);
        sphereGroup.rotation.x = -0.44;
        sphereGroup.rotation.y = 0.5;

        const geometry = new Sphere(gl, {
          radius: 0.56,
          widthSegments: 42,
          heightSegments: 30,
        });

        const lightDirection = new Vec3(0.62, 0.84, 1);

        const spheres = SPHERE_LAYOUT.map((position, index) => {
          const [red, green, blue] = hexToRgb(sphereColors[index]);
          const program = new Program(gl, {
            vertex: VERTEX_SHADER,
            fragment: FRAGMENT_SHADER,
            uniforms: {
              uColor: { value: new Vec3(red, green, blue) },
              uLightDirection: { value: lightDirection },
              uSpecColor: { value: new Vec3(0.92, 0.94, 0.98) },
              uAmbient: { value: 0.4 },
              uRimStrength: { value: 0.16 },
            },
          });

          const sphere = new Mesh(gl, { geometry, program });
          sphere.position.set(position.x, position.y, position.z);
          sphere.setParent(sphereGroup);
          return sphere;
        });

        const resize = () => {
          if (!hostRef.current) {
            return;
          }
          const { width, height } = readHostSize(hostRef.current);
          renderer.setSize(width, height);
          camera.perspective({ aspect: width / height });
        };

        resize();
        window.addEventListener("resize", resize);

        const interaction = {
          active: false,
          panMode: false,
          pointerId: null,
          lastX: 0,
          lastY: 0,
          rotationX: -0.44,
          rotationY: 0.5,
          targetRotationX: -0.44,
          targetRotationY: 0.5,
          panX: 0,
          panY: 0,
          targetPanX: 0,
          targetPanY: 0,
          distance: 7.4,
          targetDistance: 7.4,
        };

        const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

        const setPointer = (event) => {
          interaction.active = true;
          interaction.pointerId = event.pointerId;
          interaction.lastX = event.clientX;
          interaction.lastY = event.clientY;
          interaction.panMode = event.button === 2 || event.shiftKey;
        };

        const onPointerDown = (event) => {
          if (event.button !== 0 && event.button !== 2) {
            return;
          }
          setPointer(event);
          gl.canvas.setPointerCapture(event.pointerId);
        };

        const onPointerMove = (event) => {
          if (!interaction.active || interaction.pointerId !== event.pointerId) {
            return;
          }

          const deltaX = event.clientX - interaction.lastX;
          const deltaY = event.clientY - interaction.lastY;
          interaction.lastX = event.clientX;
          interaction.lastY = event.clientY;

          if (interaction.panMode) {
            interaction.targetPanX += deltaX * 0.006;
            interaction.targetPanY -= deltaY * 0.006;
            interaction.targetPanX = clamp(interaction.targetPanX, -1.8, 1.8);
            interaction.targetPanY = clamp(interaction.targetPanY, -1.4, 1.4);
            return;
          }

          interaction.targetRotationY += deltaX * 0.008;
          interaction.targetRotationX -= deltaY * 0.006;
          interaction.targetRotationX = clamp(interaction.targetRotationX, -1.15, 0.2);
        };

        const clearPointer = (event) => {
          if (interaction.pointerId !== event.pointerId) {
            return;
          }
          interaction.active = false;
          interaction.pointerId = null;
          interaction.panMode = false;
        };

        const onWheel = (event) => {
          event.preventDefault();
          interaction.targetDistance += event.deltaY * 0.01;
          interaction.targetDistance = clamp(interaction.targetDistance, 5.4, 11.5);
        };

        const onContextMenu = (event) => {
          event.preventDefault();
        };

        gl.canvas.addEventListener("pointerdown", onPointerDown);
        gl.canvas.addEventListener("pointermove", onPointerMove);
        gl.canvas.addEventListener("pointerup", clearPointer);
        gl.canvas.addEventListener("pointercancel", clearPointer);
        gl.canvas.addEventListener("wheel", onWheel, { passive: false });
        gl.canvas.addEventListener("contextmenu", onContextMenu);

        const start = performance.now();
        const animate = (time) => {
          if (isDisposed) {
            return;
          }

          const elapsed = (time - start) * 0.001;
          interaction.rotationX +=
            (interaction.targetRotationX - interaction.rotationX) * 0.13;
          interaction.rotationY +=
            (interaction.targetRotationY - interaction.rotationY) * 0.13;
          interaction.panX += (interaction.targetPanX - interaction.panX) * 0.13;
          interaction.panY += (interaction.targetPanY - interaction.panY) * 0.13;
          interaction.distance +=
            (interaction.targetDistance - interaction.distance) * 0.16;

          sphereGroup.rotation.y =
            interaction.rotationY + Math.sin(elapsed * 0.24) * 0.03;
          sphereGroup.rotation.x =
            interaction.rotationX + Math.cos(elapsed * 0.2) * 0.012;
          sphereGroup.position.x = interaction.panX;
          sphereGroup.position.y = interaction.panY;
          camera.position.z = interaction.distance;

          spheres.forEach((sphere, index) => {
            const base = SPHERE_LAYOUT[index];
            sphere.position.z =
              base.z + Math.sin(elapsed * 0.85 + index * 0.5) * 0.032;
            sphere.rotation.y = elapsed * 0.44 + index * 0.12;
          });

          renderer.render({ scene, camera });
          frameId = window.requestAnimationFrame(animate);
        };

        frameId = window.requestAnimationFrame(animate);

        teardownScene = () => {
          if (frameId) {
            window.cancelAnimationFrame(frameId);
          }
          window.removeEventListener("resize", resize);
          gl.canvas.removeEventListener("pointerdown", onPointerDown);
          gl.canvas.removeEventListener("pointermove", onPointerMove);
          gl.canvas.removeEventListener("pointerup", clearPointer);
          gl.canvas.removeEventListener("pointercancel", clearPointer);
          gl.canvas.removeEventListener("wheel", onWheel);
          gl.canvas.removeEventListener("contextmenu", onContextMenu);
          spheres.forEach((sphere) => {
            sphere.setParent(null);
          });

          if (host.contains(gl.canvas)) {
            host.removeChild(gl.canvas);
          }

          const loseContextExtension = gl.getExtension("WEBGL_lose_context");
          if (loseContextExtension) {
            loseContextExtension.loseContext();
          }
        };
      } catch (_error) {
        setRenderError("3D preview is unavailable on this device.");
      }
    };

    mountScene();

    return () => {
      isDisposed = true;
      teardownScene();
    };
  }, [colorSignature]);

  return (
    <div
      className="inspire-style-library-fallback inspire-style-library-3d"
      aria-label={title || "Style palette"}
    >
      <div className="inspire-style-library-stage">
        <div
          ref={hostRef}
          className="inspire-style-library-canvas-host"
          aria-hidden="true"
        />
        {renderError ? (
          <div className="inspire-style-library-fallback-note">{renderError}</div>
        ) : null}
      </div>
    </div>
  );
}
