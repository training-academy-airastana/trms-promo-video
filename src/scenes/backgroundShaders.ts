import {ribbedGlassShader, ribbedGlassUniforms} from './ribbedGlassShader';

export const backgroundVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // A backplate in this same Three scene: independent of foreground camera dolly.
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

export const backgroundFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uKeyCenter;
  uniform vec2 uFillCenter;
  uniform vec2 uFocus;
  uniform vec3 uKeyPosition;
  uniform vec3 uFillPosition;
  uniform vec3 uKeyColor;
  uniform vec3 uFillColor;
  uniform vec3 uBaseColor;
  uniform float uEnergy;
  uniform float uAccent;
  uniform float uSpread;
  uniform float uDirection;
  uniform float uSheen;
  uniform float uSheenPosition;
  uniform float uWarpStrength;
  uniform float uFocusWeight;
  uniform float uClosingWeight;
  uniform float uExposure;
  uniform float uContrast;
  ${ribbedGlassUniforms}

  float hash12(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 s = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), s.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0)), s.x), s.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amplitude = 0.57;
    mat2 turn = mat2(0.80, -0.60, 0.60, 0.80);
    for (int i = 0; i < 3; i++) {
      v += amplitude * noise2(p);
      p = turn * p * 2.03 + vec2(13.7, 8.4);
      amplitude *= 0.46;
    }
    return v;
  }
  mat2 rotate2(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat2(c, -s, s, c);
  }
  float lobe(vec2 p, vec2 center, vec2 size, float angle) {
    vec2 d = rotate2(angle) * (p - center);
    d /= size;
    return exp(-dot(d, d) * 2.0);
  }

  vec3 sampleBackground(vec2 uv) {
    float aspect = uResolution.x / uResolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    // Nonperiodic advection through smooth noise. No oscillating UV loop.
    vec2 advection = vec2(uTime * 0.049, -uTime * 0.029);
    vec2 warp = vec2(fbm(p * 1.7 + advection + 2.3),
                     fbm(p * 1.6 - advection * 0.73 + 18.1)) - 0.45;
    vec2 opticalUv = uv + warp * uWarpStrength;

    // Barely visible adjoining optical facets, illuminated by the same continuous field.
    float paneCoordinate = (opticalUv.x + opticalUv.y * sin(uDirection) * 0.55) * 13.0;
    float pane = fract(paneCoordinate);
    float oldFacets = 1.0 - uGlassMode;
    float seam = smoothstep(0.965, 1.0, pane) * oldFacets;
    float facet = (pane - 0.5) * 0.009 * oldFacets;
    opticalUv.x += facet;
    opticalUv.y += facet * 0.23;

    float warmth = lobe(opticalUv, uKeyCenter, vec2(0.48 * uSpread, 0.43), uDirection);
    float core = lobe(opticalUv, uKeyCenter + vec2(-0.055, -0.07), vec2(0.27 * uSpread, 0.31), uDirection);
    float blueEdge = lobe(opticalUv, uKeyCenter + vec2(0.16, 0.065), vec2(0.52 * uSpread, 0.36), uDirection);
    float fill = lobe(opticalUv, uFillCenter, vec2(0.55, 0.49), -uDirection * 0.6);
    float focus = lobe(opticalUv, uFocus, vec2(0.29, 0.36), 0.2);

    // Analytical shallow curvature and small normal variations create a rolling reflection.
    float surfaceNoise = fbm(p * 2.1 + advection * 0.47);
    float dx = noise2(p * 2.1 + advection * 0.47 + vec2(0.035, 0.0)) -
               noise2(p * 2.1 + advection * 0.47 - vec2(0.035, 0.0));
    float dy = noise2(p * 2.1 + advection * 0.47 + vec2(0.0, 0.035)) -
               noise2(p * 2.1 + advection * 0.47 - vec2(0.0, 0.035));
    vec3 surfacePoint = vec3(p.x * 7.8, p.y * 7.8, -7.5 + 0.10 * dot(p, p));
    vec3 normal = normalize(vec3(-p.x * 0.10 - dx * 0.14 - facet * 1.4,
                                -p.y * 0.075 - dy * 0.14, 1.0));
    vec3 viewDirection = normalize(vec3(0.0, 0.0, 13.0) - surfacePoint);
    vec3 keyDirection = normalize(uKeyPosition - surfacePoint);
    vec3 fillDirection = normalize(uFillPosition - surfacePoint);
    float diffuse = 0.32 + 0.68 * max(dot(normal, keyDirection), 0.0);
    float keySpecular = pow(max(dot(normal, normalize(keyDirection + viewDirection)), 0.0), 38.0);
    float fillSpecular = pow(max(dot(normal, normalize(fillDirection + viewDirection)), 0.0), 26.0);

    float diagonal = dot(p, normalize(vec2(0.65, 1.0))) - uSheenPosition;
    float specularSweep = exp(-pow(diagonal / 0.19, 2.0)) * uSheen;
    specularSweep *= 0.42 + 0.58 * surfaceNoise;

    vec3 color = uBaseColor * (0.94 + 0.12 * surfaceNoise);
    color += uKeyColor * warmth * diffuse * 0.055 * uEnergy * (0.90 + 0.20 * surfaceNoise);
    color += uKeyColor * core * 0.38 * uEnergy;
    color += uFillColor * blueEdge * (1.0 - core * 0.68) * 0.22 * uEnergy;
    color += uFillColor * fill * 0.004 * uEnergy;
    color += uKeyColor * focus * 0.004 * uFocusWeight;
    color += uKeyColor * keySpecular * warmth * 0.035 * uEnergy;
    color += uFillColor * fillSpecular * fill * 0.004 * uEnergy;
    color += mix(uFillColor, uKeyColor, 0.65) * specularSweep * 0.012;

    // Thresholded, analytic broad glow: only the high-radiance source contributes.
    // This is a restrained bloom approximation, not a full-screen brightening pass.
    float brightSource = smoothstep(0.94, 1.20, uEnergy + uAccent * 0.8);
    float broadHalo = lobe(uv, uKeyCenter, vec2(0.67 * uSpread, 0.56), uDirection);
    color += uKeyColor * broadHalo * brightSource * 0.012;
    color *= 1.0 + seam * 0.025;
    color += uKeyColor * (pane - 0.5) * warmth * 0.002;

    // A broad, feathered darker region keeps moving light from washing out type.
    float connectedType = smoothstep(7.0, 8.0, uTime) * (1.0 - smoothstep(14.0, 15.0, uTime));
    float certificateType = smoothstep(25.2, 26.5, uTime) * (1.0 - smoothstep(32.2, 33.0, uTime));
    vec2 typeCenter = mix(vec2(0.25, 0.52), vec2(0.50, 0.72), connectedType);
    typeCenter = mix(typeCenter, vec2(0.73, 0.52), certificateType);
    typeCenter = mix(typeCenter, vec2(0.50, 0.43), uClosingWeight);
    float typeProtection = lobe(uv, typeCenter, vec2(0.37, 0.30), 0.0);
    color *= 1.0 - typeProtection * 0.42;
    float edgeVignette = smoothstep(0.28, 1.05, length(p * vec2(0.72, 1.0)));
    color *= 1.0 - edgeVignette * 0.12;
    color *= 1.0 + uClosingWeight * 0.04;
    return max(color, vec3(0.0));
  }

  ${ribbedGlassShader}

  void main() {
    vec3 color = sampleBackground(vUv);
    if (uGlassStrength > 0.0001) color = applyRibbedGlass(vUv, color);
    color = pow(max(color, vec3(0.0)), vec3(uContrast)) * uExposure;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
    // Fixed screen-space dither in output space removes banding without temporal shimmer.
    float grain = hash12(floor(vUv * uResolution) + vec2(19.3, 7.1)) - 0.5;
    gl_FragColor.rgb += grain / 255.0;
  }
`;
