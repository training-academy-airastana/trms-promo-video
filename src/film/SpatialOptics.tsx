import {useLayoutEffect, useMemo, useRef} from 'react';
import {useThree} from '@react-three/fiber';
import {DepthStencilFormat, DepthTexture, HalfFloatType, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, UnsignedInt248Type, Vector2, Vector3, WebGLRenderTarget} from 'three';
import {filmEase} from './filmStyle';

const vertexShader = `varying vec2 vUv;
  void main() {vUv = uv; gl_Position = vec4(position.xy, 0., 1.);}`;
const fragmentShader = `
  uniform sampler2D uColor;
  uniform sampler2D uBlur;
  uniform sampler2D uDepth;
  uniform float uNear;
  uniform float uFar;
  uniform float uFocus;
  uniform float uAperture;
  uniform float uMaxBlur;
  uniform float uFlash;
  uniform float uFlashSpread;
  uniform float uAspect;
  varying vec2 vUv;
  float distanceAt(vec2 uv) {
    float d = texture2D(uDepth, uv).x;
    return uNear * uFar / (uFar - d * (uFar - uNear));
  }
  float coc(float z) {return min(abs(z - uFocus) / max(z, 1.) * uAperture, uMaxBlur);}
  void main() {
    float depth = texture2D(uDepth, vUv).x;
    float z = distanceAt(vUv);
    // Background pixels gather defocused geometry too: blur extends past silhouettes.
    float radius = depth > .99998 ? uMaxBlur : coc(z);
    vec3 color = texture2D(uColor, vUv).rgb;
    vec4 soft = texture2D(uBlur, vUv);
    vec3 blurred = soft.a > .02 ? soft.rgb / soft.a : color;
    color = mix(color, blurred, smoothstep(1.5, 5., radius));
    // A central optical exposure in linear HDR, before the film's tone map.
    // It expands and dissipates rather than toggling a white overlay.
    vec2 p = (vUv - vec2(.5)) * vec2(uAspect, 1.);
    float spread = mix(.12, .76, uFlashSpread);
    float halo = exp(-dot(p, p) / (spread * spread));
    float core = exp(-dot(p, p) / (.012 + .07 * uFlashSpread));
    color += vec3(.84, .92, 1.) * uFlash * (halo * 2.8 + core * 3.5);
    gl_FragColor = vec4(color, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const blurFragmentShader = `
  uniform sampler2D uSource;
  uniform sampler2D uDepth;
  uniform vec2 uDirection;
  uniform float uNear;
  uniform float uFar;
  uniform float uFocus;
  uniform float uAperture;
  uniform float uMaxBlur;
  uniform float uMaskPass;
  varying vec2 vUv;
  void main() {
    vec4 sum = vec4(0.);
    float weights = 0.;
    // Separable Gaussian at reduced resolution, with dense stable taps.
    // Sharp foreground is removed from the blur source to prevent text halos.
    for (int i = -15; i <= 15; i++) {
      float x = float(i);
      float weight = exp(-.5 * x * x / 25.);
      vec2 uv = clamp(vUv + uDirection * x * uMaxBlur / 15., vec2(.001), vec2(.999));
      vec4 sampleColor = texture2D(uSource, uv);
      if (uMaskPass > .5) {
        float depth = texture2D(uDepth, uv).x;
        float z = uNear * uFar / (uFar - depth * (uFar - uNear));
        float coc = abs(z - uFocus) / max(z, 1.) * uAperture;
        float coverage = depth > .99998 ? 1. : smoothstep(1.5, 4.5, coc);
        sampleColor = vec4(sampleColor.rgb * coverage, coverage);
      }
      sum += sampleColor * weight;
      weights += weight;
    }
    gl_FragColor = sum / weights;
  }
`;

/** Runs only when ThreeCanvas renders a requested frame. No independent animation loop. */
export const SpatialOptics = ({seconds, opening = false, flash, width, height}: {seconds: number; opening?: boolean; flash?: {intensity: number; spread: number}; width: number; height: number}) => {
  const {gl, scene, camera} = useThree();
  const time = useRef(seconds);
  time.current = seconds;
  const isOpening = useRef(opening);
  isOpening.current = opening;
  const flashState = useRef(flash);
  flashState.current = flash;
  const optics = useMemo(() => {
    const target = new WebGLRenderTarget(width, height, {type: HalfFloatType, depthBuffer: true, stencilBuffer: true, samples: 4});
    target.depthTexture = new DepthTexture(width, height, UnsignedInt248Type);
    target.depthTexture.format = DepthStencilFormat;
    const blurSize = [Math.ceil(width / 3), Math.ceil(height / 3)];
    const horizontal = new WebGLRenderTarget(blurSize[0], blurSize[1], {type: HalfFloatType, depthBuffer: false});
    const vertical = new WebGLRenderTarget(blurSize[0], blurSize[1], {type: HalfFloatType, depthBuffer: false});
    const shared = {
      uNear: {value: .1}, uFar: {value: 60}, uFocus: {value: 12}, uAperture: {value: 14}, uMaxBlur: {value: 10},
    };
    const blurX = new ShaderMaterial({vertexShader, fragmentShader: blurFragmentShader, depthTest: false, depthWrite: false, toneMapped: false, uniforms: {
      ...shared, uSource: {value: target.texture}, uDepth: {value: target.depthTexture}, uDirection: {value: new Vector2(1 / width, 0)}, uMaskPass: {value: 1},
    }});
    const blurY = new ShaderMaterial({vertexShader, fragmentShader: blurFragmentShader, depthTest: false, depthWrite: false, toneMapped: false, uniforms: {
      ...shared, uSource: {value: horizontal.texture}, uDepth: {value: target.depthTexture}, uDirection: {value: new Vector2(0, 1 / height)}, uMaskPass: {value: 0},
    }});
    const material = new ShaderMaterial({
      vertexShader, fragmentShader, depthTest: false, depthWrite: false,
      uniforms: {
        ...shared, uColor: {value: target.texture}, uDepth: {value: target.depthTexture}, uBlur: {value: vertical.texture},
        uFlash: {value: 0}, uFlashSpread: {value: 0}, uAspect: {value: width / height},
      },
    });
    const geometry = new PlaneGeometry(2, 2);
    const screen = new Scene();
    const quad = new Mesh(geometry, material);
    screen.add(quad);
    return {target, horizontal, vertical, blurX, blurY, material, geometry, screen, quad, camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1)};
  }, [width, height]);
  useLayoutEffect(() => {
    const render = gl.render;
    let drawing = false;
    gl.render = function (source, view) {
      // Leave PMREM, transmission buffers and all other offscreen work untouched.
      if (drawing || source !== scene || gl.getRenderTarget() !== null) {
        render.call(gl, source, view);
        return;
      }
      drawing = true;
      try {
        const t = time.current;
        const focus = new Vector3(t >= 25 && t < 33 ? -.8 : 0, 0, isOpening.current ? 1 : .6);
        optics.material.uniforms.uFocus.value = camera.position.distanceTo(focus);
        const openingSoftness = isOpening.current ? 1 - filmEase(t, 4.3, 6.6) : 0;
        optics.material.uniforms.uAperture.value = (14 + openingSoftness * 38) * (1 - .65 * filmEase(t, 35, 37));
        optics.material.uniforms.uMaxBlur.value = 10 + openingSoftness * 14;
        optics.material.uniforms.uFlash.value = flashState.current?.intensity ?? 0;
        optics.material.uniforms.uFlashSpread.value = flashState.current?.spread ?? 0;
        gl.setRenderTarget(optics.target);
        render.call(gl, source, view);
        optics.quad.material = optics.blurX;
        gl.setRenderTarget(optics.horizontal);
        render.call(gl, optics.screen, optics.camera);
        optics.quad.material = optics.blurY;
        gl.setRenderTarget(optics.vertical);
        render.call(gl, optics.screen, optics.camera);
        optics.quad.material = optics.material;
        gl.setRenderTarget(null);
        render.call(gl, optics.screen, optics.camera);
      } finally {
        gl.setRenderTarget(null);
        drawing = false;
      }
    };
    return () => {
      gl.render = render;
      optics.target.depthTexture?.dispose();
      optics.target.dispose();
      optics.horizontal.dispose();
      optics.vertical.dispose();
      optics.blurX.dispose();
      optics.blurY.dispose();
      optics.material.dispose();
      optics.geometry.dispose();
    };
  }, [gl, scene, camera, optics]);
  return null;
};
