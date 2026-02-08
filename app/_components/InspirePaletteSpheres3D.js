"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

const SPHERE_COUNT = 6;
const CAMERA_DISTANCE = 8.4;
const SPHERE_RADIUS = 0.56;
const LABEL_Y_OFFSET = 0.92;
const BASE_AMBIENT = 0.4;
const LOCKED_AMBIENT = 0.46;
const BASE_RIM_STRENGTH = 0.16;
const SELECTED_RIM_STRENGTH = 0.24;
const LOCKED_RIM_STRENGTH = 0.32;

const SPHERE_LAYOUT = [
  { x: -1.9, y: 1.05, z: 0 },
  { x: 0, y: 1.05, z: 0 },
  { x: 1.9, y: 1.05, z: 0 },
  { x: -1.9, y: -1.05, z: 0 },
  { x: 0, y: -1.05, z: 0 },
  { x: 1.9, y: -1.05, z: 0 },
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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeSphereIndex = (value) => {
  if (!Number.isInteger(value)) {
    return null;
  }
  if (value < 0 || value >= SPHERE_COUNT) {
    return null;
  }
  return value;
};

const formatHexColorValue = (color) => {
  return `#${normalizeHexColor(color).toUpperCase()}`;
};

const InspirePaletteSpheres3D = forwardRef(function InspirePaletteSpheres3D(
  { title, colors, onSelectionStateChange },
  ref
) {
  const hostRef = useRef(null);
  const sceneApiRef = useRef(null);
  const [renderError, setRenderError] = useState("");
  const [selectedSphereIndex, setSelectedSphereIndex] = useState(null);
  const [lockedSphereIndices, setLockedSphereIndices] = useState([]);
  const [labelAnchor, setLabelAnchor] = useState(null);
  const selectedSphereIndexRef = useRef(null);
  const lockedSphereIndicesRef = useRef([]);

  const sphereColors = useMemo(() => buildSphereColors(colors), [colors]);
  const colorSignature = sphereColors.join("|");

  const selectedColor = useMemo(() => {
    if (selectedSphereIndex === null) {
      return null;
    }
    return sphereColors[selectedSphereIndex] ?? null;
  }, [selectedSphereIndex, sphereColors]);

  const hexColorValue = useMemo(() => {
    if (!selectedColor) {
      return "";
    }
    return formatHexColorValue(selectedColor);
  }, [selectedColor]);

  const isSelectedSphereLocked = useMemo(() => {
    return (
      selectedSphereIndex !== null && lockedSphereIndices.includes(selectedSphereIndex)
    );
  }, [lockedSphereIndices, selectedSphereIndex]);

  const toggleSelectedSphereLock = useCallback(() => {
    if (selectedSphereIndex === null) {
      return;
    }
    setLockedSphereIndices((current) => {
      if (current.includes(selectedSphereIndex)) {
        return current.filter((index) => index !== selectedSphereIndex);
      }
      return [...current, selectedSphereIndex].sort((left, right) => left - right);
    });
  }, [selectedSphereIndex]);

  useImperativeHandle(
    ref,
    () => ({
      toggleSelectedSphereLock,
      hasSelectedSphere: selectedSphereIndex !== null,
      isSelectedSphereLocked,
    }),
    [isSelectedSphereLocked, selectedSphereIndex, toggleSelectedSphereLock]
  );

  useEffect(() => {
    onSelectionStateChange?.({
      hasSelection: selectedSphereIndex !== null,
      isLocked: isSelectedSphereLocked,
    });
  }, [isSelectedSphereLocked, onSelectionStateChange, selectedSphereIndex]);

  useEffect(() => {
    selectedSphereIndexRef.current = selectedSphereIndex;
    sceneApiRef.current?.setSelection(selectedSphereIndex);
  }, [selectedSphereIndex]);

  useEffect(() => {
    lockedSphereIndicesRef.current = lockedSphereIndices;
    sceneApiRef.current?.setLocks(lockedSphereIndices);
  }, [lockedSphereIndices]);

  useEffect(() => {
    let isDisposed = false;
    let frameId = null;
    let teardownScene = () => {};

    setRenderError("");
    setLabelAnchor(null);

    const mountScene = async () => {
      const host = hostRef.current;
      if (!host) {
        return;
      }

      try {
        const {
          Camera,
          Mesh,
          Program,
          Raycast,
          Renderer,
          Sphere,
          Transform,
          Vec3,
        } = await import("ogl");
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
        gl.canvas.style.touchAction = "none";
        host.appendChild(gl.canvas);

        const camera = new Camera(gl, { fov: 33, near: 0.1, far: 100 });
        camera.position.set(0, 0, CAMERA_DISTANCE);

        const scene = new Transform();
        const sphereGroup = new Transform();
        sphereGroup.setParent(scene);

        const geometry = new Sphere(gl, {
          radius: SPHERE_RADIUS,
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
              uAmbient: { value: BASE_AMBIENT },
              uRimStrength: { value: BASE_RIM_STRENGTH },
            },
          });

          const sphere = new Mesh(gl, { geometry, program });
          sphere.position.set(position.x, position.y, position.z);
          sphere.paletteIndex = index;
          sphere.setParent(sphereGroup);
          return sphere;
        });

        const raycast = new Raycast();
        const lockedSet = new Set();
        let currentSelection = null;
        let size = readHostSize(host);

        const interaction = {
          active: false,
          panMode: false,
          pointerId: null,
          lastX: 0,
          lastY: 0,
          dragDistance: 0,
          rotationX: 0,
          rotationY: 0,
          targetRotationX: 0,
          targetRotationY: 0,
          panX: 0,
          panY: 0,
          targetPanX: 0,
          targetPanY: 0,
          distance: CAMERA_DISTANCE,
          targetDistance: CAMERA_DISTANCE,
        };

        const updateLabelAnchor = () => {
          if (isDisposed || currentSelection === null) {
            setLabelAnchor(null);
            return;
          }

          const sphere = spheres[currentSelection];
          if (!sphere) {
            setLabelAnchor(null);
            return;
          }

          const labelPoint = new Vec3();
          sphere.worldMatrix.getTranslation(labelPoint);
          labelPoint.y += LABEL_Y_OFFSET;
          camera.project(labelPoint);

          const x = clamp((labelPoint.x * 0.5 + 0.5) * size.width, 16, size.width - 16);
          const y = clamp(
            (-labelPoint.y * 0.5 + 0.5) * size.height,
            16,
            size.height - 16
          );
          setLabelAnchor({ x, y });
        };

        const renderScene = () => {
          if (isDisposed) {
            return;
          }
          sphereGroup.rotation.x = interaction.rotationX;
          sphereGroup.rotation.y = interaction.rotationY;
          sphereGroup.position.x = interaction.panX;
          sphereGroup.position.y = interaction.panY;
          camera.position.z = interaction.distance;
          scene.updateMatrixWorld();
          camera.updateMatrixWorld();
          renderer.render({ scene, camera });
          updateLabelAnchor();
        };

        const applySphereVisualState = () => {
          spheres.forEach((sphere, index) => {
            const isSelected = index === currentSelection;
            const isLocked = lockedSet.has(index);
            const scale = isSelected ? 1.08 : 1;
            sphere.scale.set(scale, scale, scale);
            sphere.program.uniforms.uAmbient.value = isLocked
              ? LOCKED_AMBIENT
              : BASE_AMBIENT;
            sphere.program.uniforms.uRimStrength.value = isLocked
              ? LOCKED_RIM_STRENGTH
              : isSelected
              ? SELECTED_RIM_STRENGTH
              : BASE_RIM_STRENGTH;
            sphere.program.uniforms.uSpecColor.value.set(
              isLocked ? 1 : 0.92,
              isLocked ? 0.86 : 0.94,
              isLocked ? 0.62 : 0.98
            );
          });
        };

        const setSelection = (index) => {
          currentSelection = normalizeSphereIndex(index);
          applySphereVisualState();
        };

        const setLocks = (indices) => {
          lockedSet.clear();
          (indices ?? []).forEach((index) => {
            const normalizedIndex = normalizeSphereIndex(index);
            if (normalizedIndex !== null) {
              lockedSet.add(normalizedIndex);
            }
          });
          applySphereVisualState();
        };

        const getHoveredSphereIndex = (event) => {
          const rect = gl.canvas.getBoundingClientRect();
          if (!rect.width || !rect.height) {
            return null;
          }
          scene.updateMatrixWorld();
          camera.updateMatrixWorld();
          const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycast.castMouse(camera, [x, y]);
          const hits = raycast.intersectMeshes(spheres, {
            cullFace: false,
            includeUV: false,
            includeNormal: false,
          });
          if (!hits.length) {
            return null;
          }
          return normalizeSphereIndex(hits[0]?.paletteIndex);
        };

        const resize = () => {
          if (!hostRef.current) {
            return;
          }
          size = readHostSize(hostRef.current);
          renderer.setSize(size.width, size.height);
          camera.perspective({ aspect: size.width / size.height });
          renderScene();
        };

        const onPointerDown = (event) => {
          if (event.button !== 0 && event.button !== 2) {
            return;
          }
          event.preventDefault();
          interaction.active = true;
          interaction.pointerId = event.pointerId;
          interaction.lastX = event.clientX;
          interaction.lastY = event.clientY;
          interaction.dragDistance = 0;
          interaction.panMode = event.button === 2 || event.shiftKey;
          gl.canvas.setPointerCapture(event.pointerId);
        };

        const onPointerMove = (event) => {
          if (!interaction.active || interaction.pointerId !== event.pointerId) {
            const hoveredIndex = getHoveredSphereIndex(event);
            gl.canvas.style.cursor = hoveredIndex === null ? "default" : "pointer";
            return;
          }

          const deltaX = event.clientX - interaction.lastX;
          const deltaY = event.clientY - interaction.lastY;
          interaction.lastX = event.clientX;
          interaction.lastY = event.clientY;
          interaction.dragDistance += Math.abs(deltaX) + Math.abs(deltaY);

          if (interaction.panMode) {
            interaction.targetPanX = clamp(
              interaction.targetPanX + deltaX * 0.006,
              -1.8,
              1.8
            );
            interaction.targetPanY = clamp(
              interaction.targetPanY - deltaY * 0.006,
              -1.4,
              1.4
            );
            return;
          }

          interaction.targetRotationY += deltaX * 0.008;
          interaction.targetRotationX = clamp(
            interaction.targetRotationX - deltaY * 0.006,
            -1.15,
            0.95
          );
        };

        const clearPointer = (event) => {
          if (interaction.pointerId !== event.pointerId) {
            return;
          }
          const shouldSelect = interaction.dragDistance < 6;
          interaction.active = false;
          interaction.pointerId = null;
          interaction.panMode = false;
          interaction.dragDistance = 0;
          if (!shouldSelect) {
            return;
          }
          const selectedIndex = getHoveredSphereIndex(event);
          setSelectedSphereIndex(selectedIndex);
        };

        const onWheel = (event) => {
          event.preventDefault();
          interaction.targetDistance = clamp(
            interaction.targetDistance + event.deltaY * 0.01,
            6.2,
            12.2
          );
        };

        const onContextMenu = (event) => {
          event.preventDefault();
        };

        const onPointerLeave = () => {
          gl.canvas.style.cursor = "default";
        };

        sceneApiRef.current = { setSelection, setLocks };

        resize();
        setSelection(selectedSphereIndexRef.current);
        setLocks(lockedSphereIndicesRef.current);

        const animate = () => {
          if (isDisposed) {
            return;
          }
          interaction.rotationX +=
            (interaction.targetRotationX - interaction.rotationX) * 0.13;
          interaction.rotationY +=
            (interaction.targetRotationY - interaction.rotationY) * 0.13;
          interaction.panX += (interaction.targetPanX - interaction.panX) * 0.13;
          interaction.panY += (interaction.targetPanY - interaction.panY) * 0.13;
          interaction.distance +=
            (interaction.targetDistance - interaction.distance) * 0.16;
          renderScene();
          frameId = window.requestAnimationFrame(animate);
        };

        frameId = window.requestAnimationFrame(animate);

        window.addEventListener("resize", resize);
        gl.canvas.addEventListener("pointerdown", onPointerDown);
        gl.canvas.addEventListener("pointermove", onPointerMove);
        gl.canvas.addEventListener("pointerup", clearPointer);
        gl.canvas.addEventListener("pointercancel", clearPointer);
        gl.canvas.addEventListener("pointerleave", onPointerLeave);
        gl.canvas.addEventListener("wheel", onWheel, { passive: false });
        gl.canvas.addEventListener("contextmenu", onContextMenu);

        teardownScene = () => {
          if (frameId) {
            window.cancelAnimationFrame(frameId);
          }
          window.removeEventListener("resize", resize);
          gl.canvas.removeEventListener("pointerdown", onPointerDown);
          gl.canvas.removeEventListener("pointermove", onPointerMove);
          gl.canvas.removeEventListener("pointerup", clearPointer);
          gl.canvas.removeEventListener("pointercancel", clearPointer);
          gl.canvas.removeEventListener("pointerleave", onPointerLeave);
          gl.canvas.removeEventListener("wheel", onWheel);
          gl.canvas.removeEventListener("contextmenu", onContextMenu);
          gl.canvas.style.cursor = "default";
          spheres.forEach((sphere) => {
            sphere.setParent(null);
          });

          if (sceneApiRef.current?.setSelection === setSelection) {
            sceneApiRef.current = null;
          }

          if (host.contains(gl.canvas)) {
            host.removeChild(gl.canvas);
          }

          const loseContextExtension = gl.getExtension("WEBGL_lose_context");
          if (loseContextExtension) {
            loseContextExtension.loseContext();
          }
        };
      } catch (_error) {
        if (!isDisposed) {
          setRenderError("3D preview is unavailable on this device.");
        }
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
        <div className="inspire-style-library-overlay">
          {selectedSphereIndex !== null && labelAnchor ? (
            <div
              className={`inspire-style-library-rgb-label${
                isSelectedSphereLocked ? " is-locked" : ""
              }`}
              style={{
                left: `${labelAnchor.x}px`,
                top: `${labelAnchor.y}px`,
              }}
            >
              <span className="inspire-style-library-rgb-value">{hexColorValue}</span>
            </div>
          ) : null}
        </div>
        {renderError ? (
          <div className="inspire-style-library-fallback-note">{renderError}</div>
        ) : null}
      </div>
    </div>
  );
});

export default InspirePaletteSpheres3D;
