export const ribbedGlassUniforms = /* glsl */ `
  uniform float uGlassStrength;
  uniform float uGlassMode;
  uniform vec4 uGlassGeometry[7]; // center, half width, projected slope, axial tilt
  uniform vec4 uGlassOptics[7];   // thickness, IOR, roughness, visibility
`;

export const ribbedGlassShader = /* glsl */ `
  // Cross section of a shallow cylindrical plate. Entry and exit normals differ,
  // unlike a perfectly parallel window, so the transmitted bundle can focus.
  vec3 glassNormal(float q, float slope, float tilt, bool exitSurface) {
    vec2 across = normalize(vec2(1.0, -slope));
    float curvature = exitSurface ? -0.14 : 0.46;
    float normalX = q * curvature + tilt * (exitSurface ? 0.52 : 1.0);
    return normalize(vec3(across * normalX, 1.0));
  }

  vec2 glassRayOffset(float q, vec4 geometry, vec4 optics) {
    vec3 frontNormal = glassNormal(q, geometry.z, geometry.w, false);
    vec3 backNormal = glassNormal(q, geometry.z, geometry.w, true);
    vec3 insideRay = refract(vec3(0.0, 0.0, -1.0), frontNormal, 1.0 / optics.y);
    vec3 exitRay = refract(insideRay, backNormal, optics.y);
    vec2 inGlass = insideRay.xy / max(abs(insideRay.z), 0.15) * optics.x;
    vec2 behindGlass = exitRay.xy / max(abs(exitRay.z), 0.15) * 0.105;
    return inGlass + behindGlass;
  }

  vec3 applyRibbedGlass(vec2 uv, vec3 unobstructed) {
    vec2 totalOffset = vec2(0.0);
    float offsetWeight = 0.0;
    float totalMask = 0.0;
    float absorption = 0.0;
    vec3 reflectedLight = vec3(0.0);
    vec3 causticLight = vec3(0.0);
    float aspect = uResolution.x / uResolution.y;
    vec3 platePoint = vec3((uv - 0.5) * vec2(aspect, 1.0) * 7.8, -4.8);
    vec3 viewRay = normalize(vec3(0.0, 0.0, 13.0) - platePoint);
    vec3 keyRay = normalize(uKeyPosition - platePoint);
    vec3 fillRay = normalize(uFillPosition - platePoint);

    for (int i = 0; i < 7; i++) {
      vec4 geometry = uGlassGeometry[i];
      vec4 optics = uGlassOptics[i];
      float centerLine = geometry.x + (uv.y - 0.5) * geometry.z;
      float q = (uv.x - centerLine) / geometry.y;
      float mask = 1.0 - smoothstep(0.86, 1.035, abs(q));
      if (mask < 0.0001) continue;
      float visibility = optics.w * uGlassStrength;
      float weight = mask * visibility;
      vec2 offset = glassRayOffset(q, geometry, optics);
      totalOffset += offset * mask;
      offsetWeight += mask;
      totalMask = max(totalMask, weight);
      absorption += weight * optics.x * 0.12;

      vec3 normal = glassNormal(q, geometry.z, geometry.w, false);
      float f0 = pow((optics.y - 1.0) / (optics.y + 1.0), 2.0);
      float fresnel = f0 + (1.0 - f0) * pow(1.0 - max(dot(normal, viewRay), 0.0), 5.0);
      float exponent = mix(115.0, 32.0, clamp(optics.z * 3.0, 0.0, 1.0));
      float keyReflection = pow(max(dot(normal, normalize(keyRay + viewRay)), 0.0), exponent);
      float fillReflection = pow(max(dot(normal, normalize(fillRay + viewRay)), 0.0), exponent * 0.75);
      float keyIllumination = lobe(uv, uKeyCenter + vec2(0.02, 0.08), vec2(0.63 * uSpread, 0.66), uDirection);
      float fillIllumination = lobe(uv, uFillCenter, vec2(0.62, 0.72), -uDirection);
      reflectedLight += (uKeyColor * keyReflection * keyIllumination +
                         uFillColor * fillReflection * fillIllumination * 0.40) *
                         weight * fresnel * 0.42 * uEnergy;

      // Controlled caustic receiver: inverse ray-map Jacobian estimates focusing.
      // It is driven by both the cylindrical surface and the moving source.
      float dq = 0.025;
      float dx = glassRayOffset(q + dq, geometry, optics).x -
                 glassRayOffset(q - dq, geometry, optics).x;
      float jacobian = 1.0 + dx / (2.0 * dq * geometry.y);
      float focusing = clamp(1.0 / max(abs(jacobian), 0.36), 0.55, 2.5);
      float sourceSide = (uKeyCenter.x - centerLine) / (0.28 + abs(uv.y - uKeyCenter.y));
      float opticalSide = sourceSide * 1.35 + geometry.w * 2.8;
      float causticQ = 0.84 * opticalSide / sqrt(1.0 + opticalSide * opticalSide);
      float causticWidth = 0.12 + optics.z * 0.43 + 0.045 * abs(geometry.w);
      float ridge = exp(-pow((q - causticQ) / causticWidth, 2.0));
      float scatter = exp(-pow((q - causticQ) / (causticWidth * 2.7), 2.0));
      float along = exp(-pow((uv.y - uKeyCenter.y - 0.16 - geometry.w * 0.25) / 0.62, 2.0));
      float incident = keyIllumination * along * uEnergy;
      float concentrated = (ridge * 0.032 + scatter * 0.014) * focusing;
      causticLight += mix(uFillColor, uKeyColor, 0.72) * concentrated * incident * weight;
    }

    // Re-evaluate the actual procedural image at the transmitted ray position.
    vec2 refractedUv = uv + totalOffset / max(offsetWeight, 1.0);
    vec3 transmitted = sampleBackground(refractedUv);
    vec3 color = mix(unobstructed, transmitted, clamp(totalMask * 1.35, 0.0, 1.0));
    color *= 1.0 - min(absorption, 0.018);
    return color + causticLight + reflectedLight;
  }
`;
