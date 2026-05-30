import { useEffect, useMemo, useRef } from "react";
import { Sky, Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Sky as SkyImpl } from "three-stdlib";

const REAL_SECONDS_PER_SIMULATED_DAY = 24 * 60;
const LIGHTNING_DURATION_SECONDS = 0.12;
const BASE_EXPOSURE = 1.5;

const KEY_DAWN = new THREE.Color("#ff9a6a");
const KEY_DAY = new THREE.Color("#ffcf9a");
const KEY_SUNSET = new THREE.Color("#ff7a4a");
const AMBIENT_NIGHT = new THREE.Color("#3a4a6a");
const AMBIENT_DAY = new THREE.Color("#ffe1b8");
const FOG_NIGHT = new THREE.Color("#0d1428");
const FOG_TWILIGHT = new THREE.Color("#ff9a6a");
const FOG_DAY = new THREE.Color("#f4d8b6");
const TURBIDITY_KEYFRAMES: Array<[number, number]> = [
  [0, 0.1],
  [5.5, 6],
  [6.5, 10],
  [9, 6],
  [12, 4],
  [15, 6],
  [17, 12],
  [18.5, 8],
  [20, 0.1],
  [24, 0.1],
];
const RAYLEIGH_KEYFRAMES: Array<[number, number]> = [
  [0, 0.3],
  [5.5, 4],
  [6.5, 3],
  [9, 1.5],
  [12, 0.9],
  [15, 1.5],
  [17, 3],
  [18.5, 4],
  [20, 0.3],
  [24, 0.3],
];

interface DayNightCycleProps {
  worldRadius: number;
  baseFogDensity: number;
  rainEnabled: boolean;
  rainIntensity: number;
  simulatedTimeRef: React.MutableRefObject<number>;
  onLightningObserved?: () => void;
}

function segmentLerp(hour: number, start: number, end: number) {
  return THREE.MathUtils.smootherstep(
    THREE.MathUtils.clamp((hour - start) / (end - start), 0, 1),
    0,
    1,
  );
}

function interpolateKeyframes(hour: number, keyframes: Array<[number, number]>) {
  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const [startHour, startValue] = keyframes[index]!;
    const [endHour, endValue] = keyframes[index + 1]!;

    if (hour >= startHour && hour <= endHour) {
      const t = (hour - startHour) / (endHour - startHour);
      return THREE.MathUtils.lerp(startValue, endValue, t);
    }
  }

  return keyframes[0]![1];
}

function sampleSunAngles(hour: number) {
  if (hour < 4) return { elevation: -60, azimuth: -90 };
  if (hour < 6.5) {
    const t = segmentLerp(hour, 4, 6.5);
    return {
      elevation: THREE.MathUtils.lerp(-60, 0, t),
      azimuth: THREE.MathUtils.lerp(-90, 0, t),
    };
  }
  if (hour < 8) {
    const t = segmentLerp(hour, 6.5, 8);
    return {
      elevation: THREE.MathUtils.lerp(0, 30, t),
      azimuth: THREE.MathUtils.lerp(0, 30, t),
    };
  }
  if (hour < 12) {
    const t = segmentLerp(hour, 8, 12);
    return {
      elevation: THREE.MathUtils.lerp(30, 60, t),
      azimuth: THREE.MathUtils.lerp(30, 90, t),
    };
  }
  if (hour < 16) {
    const t = segmentLerp(hour, 12, 16);
    return {
      elevation: THREE.MathUtils.lerp(60, 30, t),
      azimuth: THREE.MathUtils.lerp(90, 150, t),
    };
  }
  if (hour < 17.5) {
    const t = segmentLerp(hour, 16, 17.5);
    return {
      elevation: THREE.MathUtils.lerp(30, 0, t),
      azimuth: THREE.MathUtils.lerp(150, 180, t),
    };
  }
  if (hour < 20) {
    const t = segmentLerp(hour, 17.5, 20);
    return {
      elevation: THREE.MathUtils.lerp(0, -60, t),
      azimuth: THREE.MathUtils.lerp(180, 270, t),
    };
  }
  return { elevation: -60, azimuth: 270 };
}

function sunPositionFromAngles(elevationDeg: number, azimuthDeg: number, distance: number) {
  const elevation = THREE.MathUtils.degToRad(elevationDeg);
  const azimuth = THREE.MathUtils.degToRad(azimuthDeg);
  const horizontal = Math.cos(elevation) * distance;

  return new THREE.Vector3(
    Math.cos(azimuth) * horizontal,
    Math.sin(elevation) * distance,
    Math.sin(azimuth) * horizontal,
  );
}

function skyAtmosphereForHour(hour: number) {
  return {
    turbidity: interpolateKeyframes(hour, TURBIDITY_KEYFRAMES),
    rayleigh: interpolateKeyframes(hour, RAYLEIGH_KEYFRAMES),
  };
}

function keyLightColor(hour: number, target: THREE.Color) {
  if (hour < 8) {
    const t = hour < 6.5 ? segmentLerp(hour, 4, 6.5) : segmentLerp(hour, 6.5, 8);
    return hour < 6.5
      ? target.lerpColors(KEY_DAWN, KEY_DAWN, t)
      : target.lerpColors(KEY_DAWN, KEY_DAY, t);
  }

  if (hour < 16) {
    return target.copy(KEY_DAY);
  }

  if (hour < 17.5) {
    return target.lerpColors(KEY_DAY, KEY_SUNSET, segmentLerp(hour, 16, 17.5));
  }

  if (hour < 20) {
    return target.lerpColors(KEY_SUNSET, KEY_DAWN, segmentLerp(hour, 17.5, 20));
  }

  return target.copy(KEY_DAWN);
}

function fogColor(hour: number, target: THREE.Color) {
  if (hour < 4) return target.copy(FOG_NIGHT);
  if (hour < 6.5) return target.lerpColors(FOG_NIGHT, FOG_TWILIGHT, segmentLerp(hour, 4, 6.5));
  if (hour < 8) return target.lerpColors(FOG_TWILIGHT, FOG_DAY, segmentLerp(hour, 6.5, 8));
  if (hour < 16) return target.copy(FOG_DAY);
  if (hour < 17.5) return target.lerpColors(FOG_DAY, FOG_TWILIGHT, segmentLerp(hour, 16, 17.5));
  if (hour < 20) {
    return target.lerpColors(FOG_TWILIGHT, FOG_NIGHT, segmentLerp(hour, 17.5, 20));
  }
  return target.copy(FOG_NIGHT);
}

export function formatSimulatedTime(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const wholeHours = Math.floor(normalized);
  const minutes = Math.floor((normalized - wholeHours) * 60);
  return `${wholeHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function DayNightCycle({
  worldRadius,
  baseFogDensity,
  rainEnabled,
  rainIntensity,
  simulatedTimeRef,
  onLightningObserved,
}: DayNightCycleProps) {
  const { gl, scene } = useThree();
  const fogRef = useRef<THREE.FogExp2>(null);
  const skyRef = useRef<SkyImpl>(null);
  const starsRef = useRef<THREE.Points>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const lightningStartRef = useRef<number | null>(null);

  const sunPosition = useMemo(() => new THREE.Vector3(80, 55, 40), []);
  const tempKeyColor = useMemo(() => new THREE.Color(), []);
  const tempAmbientColor = useMemo(() => new THREE.Color(), []);
  const tempFogColor = useMemo(() => new THREE.Color(), []);
  const backgroundColor = useMemo(() => new THREE.Color("#f4d8b6"), []);

  useEffect(() => {
    scene.background = backgroundColor;
    return () => {
      if (scene.background === backgroundColor) {
        scene.background = null;
      }
      gl.toneMappingExposure = BASE_EXPOSURE;
    };
  }, [backgroundColor, gl, scene]);

  useEffect(() => {
    const starsMaterial = starsRef.current?.material as THREE.ShaderMaterial | undefined;
    if (!starsMaterial) return;
    starsMaterial.transparent = true;
    starsMaterial.opacity = 0;
    if (!starsMaterial.uniforms.visibility) {
      starsMaterial.uniforms.visibility = { value: 0 };
      starsMaterial.fragmentShader = starsMaterial.fragmentShader
        .replace("uniform float fade;", "uniform float fade;\nuniform float visibility;")
        .replace(
          "gl_FragColor = vec4(vColor, opacity);",
          "gl_FragColor = vec4(vColor, opacity * visibility);",
        );
    }
    starsMaterial.needsUpdate = true;
  }, []);

  useFrame((state, delta) => {
    simulatedTimeRef.current += (delta * 24) / REAL_SECONDS_PER_SIMULATED_DAY;
    if (simulatedTimeRef.current >= 24) {
      simulatedTimeRef.current -= 24;
    }

    const hour = simulatedTimeRef.current;
    const rainAmount = rainEnabled ? THREE.MathUtils.clamp(rainIntensity / 100, 0, 1) : 0;
    const daylight = Math.max(0, Math.sin(((hour - 6) / 24) * Math.PI * 2));
    const nightFactor = 1 - daylight;
    const { elevation, azimuth } = sampleSunAngles(hour);
    const { turbidity, rayleigh } = skyAtmosphereForHour(hour);

    sunPosition.copy(
      sunPositionFromAngles(elevation, azimuth, Math.max(100, worldRadius * 2.2)),
    );

    if (lightningStartRef.current === null && rainEnabled && rainIntensity >= 60) {
      // Randomness is intentional here: lightning is a transient visual-only effect.
      const strikeChance = 0.001 * rainAmount * delta * 60;
      if (Math.random() < strikeChance) {
        lightningStartRef.current = state.clock.elapsedTime;
        onLightningObserved?.();
      }
    }

    let lightningStrength = 0;
    if (lightningStartRef.current !== null) {
      const flashAge =
        (state.clock.elapsedTime - lightningStartRef.current) / LIGHTNING_DURATION_SECONDS;
      if (flashAge < 1) {
        lightningStrength =
          flashAge < 0.25 ? flashAge / 0.25 : 1 - (flashAge - 0.25) / 0.75;
      } else {
        lightningStartRef.current = null;
      }
    }

    const keyIntensity = daylight * 2.6 * (1 - rainAmount * 0.5);
    const ambientIntensity = THREE.MathUtils.lerp(0.3, 0.78, daylight);
    const starOpacity = THREE.MathUtils.clamp((-elevation - 4) / 56, 0, 1) * 0.8;
    const fogDensity =
      baseFogDensity * (1 + nightFactor * 0.22 + (rainEnabled ? rainAmount * 0.35 : 0));

    keyLightColor(hour, tempKeyColor);
    tempAmbientColor.lerpColors(AMBIENT_NIGHT, AMBIENT_DAY, THREE.MathUtils.smootherstep(daylight, 0, 1));
    fogColor(hour, tempFogColor);
    backgroundColor.copy(tempFogColor);

    if (fogRef.current) {
      fogRef.current.color.copy(tempFogColor);
      fogRef.current.density = fogDensity;
    }

    if (skyRef.current) {
      const skyMaterial = skyRef.current.material as THREE.ShaderMaterial;
      const { uniforms } = skyMaterial;
      uniforms.sunPosition?.value.copy(sunPosition);
      if (uniforms.rayleigh) {
        uniforms.rayleigh.value = rayleigh;
      }
      if (uniforms.turbidity) {
        uniforms.turbidity.value = turbidity;
      }
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.color.copy(tempAmbientColor);
      ambientLightRef.current.intensity = ambientIntensity * (1 + lightningStrength * 3);
    }

    if (keyLightRef.current) {
      keyLightRef.current.position.copy(sunPosition);
      keyLightRef.current.color.copy(tempKeyColor);
      keyLightRef.current.intensity = keyIntensity * (1 + lightningStrength);
    }

    const starsMaterial = starsRef.current?.material as THREE.ShaderMaterial | undefined;
    if (starsMaterial) {
      starsMaterial.opacity = starOpacity;
      if (starsMaterial.uniforms.visibility) {
        starsMaterial.uniforms.visibility.value = starOpacity;
      }
      starsMaterial.needsUpdate = true;
    }

    gl.toneMappingExposure = Math.max(
      0.65,
      BASE_EXPOSURE * (rainEnabled ? 1 - rainIntensity * 0.003 : 1),
    );
  });

  return (
    <>
      <fogExp2 ref={fogRef} attach="fog" args={["#f4d8b6", baseFogDensity]} />
      <Sky
        ref={skyRef}
        distance={450000}
        sunPosition={[80, 55, 40]}
        turbidity={4}
        rayleigh={0.9}
        mieCoefficient={0.002}
        mieDirectionalG={0.62}
      />
      <Stars
        ref={starsRef}
        radius={300}
        depth={60}
        count={2600}
        factor={10}
        saturation={0}
        fade
        speed={0.5}
      />
      <ambientLight ref={ambientLightRef} color="#ffe1b8" intensity={0.78} />
      <directionalLight ref={keyLightRef} color="#ffcf9a" intensity={2.6} position={[80, 55, 40]} />
      <directionalLight
        color="#90b8ff"
        intensity={0.34}
        position={[-worldRadius * 0.8, worldRadius * 0.52, -worldRadius * 0.74]}
      />
    </>
  );
}

export default DayNightCycle;
