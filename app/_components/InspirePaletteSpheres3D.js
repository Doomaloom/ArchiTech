"use client";

import { useEffect, useMemo, useState, useRef } from "react";

const SPHERE_COUNT = 6;

const SPHERE_LAYOUT = [
  { x: -1.7, y: 0.95, z: 0.52 },
  { x: 0, y: 0.95, z: 0.34 },
  { x: 1.7, y: 0.95, z: 0.16 },
  { x: -1.7, y: -0.95, z: -0.08 },
  { x: 0, y: -0.95, z: -0.28 },
  { x: 1.7, y: -0.95, z: -0.52 },
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
uniform float uAmbient;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightDirection);
  float diffuse = max(dot(normal, lightDir), 0.0);

  vec3 viewDir = normalize(-vViewPosition);
  vec3 reflected = reflect(-lightDir, normal);
  float specular = pow(max(dot(viewDir, reflected), 0.0), 72.0);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

  vec3 base = uColor * (uAmbient + (diffuse * 0.88));
  vec3 gloss = vec3(specular * 0.82 + fresnel * 0.24);

  gl_FragColor = vec4(base + gloss, 1.0);
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

        const camera = new Camera(gl, { fov: 36, near: 0.1, far: 100 });
        camera.position.set(0, 0.2, 6.6);

        const scene = new Transform();
        const sphereGroup = new Transform();
        sphereGroup.setParent(scene);
        sphereGroup.rotation.x = -0.5;
        sphereGroup.rotation.y = 0.64;

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
              uAmbient: { value: 0.23 },
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

        const start = performance.now();
        const animate = (time) => {
          if (isDisposed) {
            return;
          }

          const elapsed = (time - start) * 0.001;
          sphereGroup.rotation.y = 0.64 + Math.sin(elapsed * 0.42) * 0.11;
          sphereGroup.rotation.x = -0.5 + Math.cos(elapsed * 0.35) * 0.05;

          spheres.forEach((sphere, index) => {
            const base = SPHERE_LAYOUT[index];
            sphere.position.z =
              base.z + Math.sin(elapsed * 1.65 + index * 0.55) * 0.08;
            sphere.rotation.y = elapsed * 0.88 + index * 0.2;
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
