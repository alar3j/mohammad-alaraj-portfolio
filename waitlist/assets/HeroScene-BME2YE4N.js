import{o as e,r as t,t as n}from"./jsx-runtime-D0wqlvYd.js";import{B as r,I as i,M as a,N as o,V as s,W as c,a as l,c as u,i as d,l as f,r as p,s as m,t as h,v as g,x as _}from"./react-three-fiber.esm-BklQWsTh.js";function v(e,t=Math.PI/3){let n=Math.cos(t),r=(1+1e-10)*100,i=[new s,new s,new s],a=new s,o=new s,c=new s,l=new s;function u(e){return`${~~(e.x*r)},${~~(e.y*r)},${~~(e.z*r)}`}let d=e.index?e.toNonIndexed():e,f=d.attributes.position,p={};for(let e=0,t=f.count/3;e<t;e++){let t=3*e,n=i[0].fromBufferAttribute(f,t+0),r=i[1].fromBufferAttribute(f,t+1),c=i[2].fromBufferAttribute(f,t+2);a.subVectors(c,r),o.subVectors(n,r);let l=new s().crossVectors(a,o).normalize();for(let e=0;e<3;e++){let t=i[e],n=u(t);n in p||(p[n]=[]),p[n].push(l)}}let h=new Float32Array(f.count*3),g=new m(h,3,!1);for(let e=0,t=f.count/3;e<t;e++){let t=3*e,r=i[0].fromBufferAttribute(f,t+0),s=i[1].fromBufferAttribute(f,t+1),d=i[2].fromBufferAttribute(f,t+2);a.subVectors(d,s),o.subVectors(r,s),c.crossVectors(a,o).normalize();for(let e=0;e<3;e++){let r=i[e],a=p[u(r)];l.set(0,0,0);for(let e=0,t=a.length;e<t;e++){let t=a[e];c.dot(t)>n&&l.add(t)}l.normalize(),g.setXYZ(t+e,l.x,l.y,l.z)}}return d.setAttribute(`normal`,g),d}var y=e(t()),b=1e-5;function x(e,t,n){let r=new o,i=n-b;return r.absarc(b,b,b,-Math.PI/2,-Math.PI,!0),r.absarc(b,t-i*2,b,Math.PI,Math.PI/2,!0),r.absarc(e-i*2,t-i*2,b,Math.PI/2,0,!0),r.absarc(e-i*2,b,b,0,-Math.PI/2,!0),r}var S=y.forwardRef(function({args:[e=1,t=1,n=1]=[],radius:r=.05,steps:i=1,smoothness:a=4,bevelSegments:o=4,creaseAngle:s=.4,children:l,...u},d){return y.createElement(`mesh`,c({ref:d},u),y.createElement(C,{args:[e,t,n],radius:r,steps:i,smoothness:a,bevelSegments:o,creaseAngle:s}),l)}),C=y.forwardRef(function({args:[e=1,t=1,n=1]=[],radius:r=.05,steps:i=1,smoothness:a=4,bevelSegments:o=4,creaseAngle:s=.4,...l},u){let d=y.useMemo(()=>x(e,t,r),[e,t,r]),f=y.useMemo(()=>({depth:n-r*2,bevelEnabled:!0,bevelSegments:o*2,steps:i,bevelSize:r-b,bevelThickness:r,curveSegments:a}),[n,r,a,o,i]),p=y.useRef(null);return y.useLayoutEffect(()=>{p.current&&(p.current.center(),v(p.current,s))},[d,f,s]),y.useImperativeHandle(u,()=>p.current),y.createElement(`extrudeGeometry`,c({ref:p,args:[d,f]},l))}),w=y.forwardRef(({children:e,enabled:t=!0,speed:n=1,rotationIntensity:r=1,floatIntensity:i=1,floatingRange:a=[-.1,.1],autoInvalidate:o=!1,...s},c)=>{let l=y.useRef(null);y.useImperativeHandle(c,()=>l.current,[]);let u=y.useRef(Math.random()*1e4);return p(e=>{if(!t||n===0)return;o&&e.invalidate();let s=u.current+e.clock.elapsedTime;l.current.rotation.x=Math.cos(s/4*n)/8*r,l.current.rotation.y=Math.sin(s/4*n)/8*r,l.current.rotation.z=Math.sin(s/4*n)/20*r;let c=Math.sin(s/4*n)/10;c=_.mapLinear(c,-.1,.1,a?.[0]??-.1,a?.[1]??.1),l.current.position.y=c*i,l.current.updateMatrix()}),y.createElement(`group`,s,y.createElement(`group`,{ref:l,matrixAutoUpdate:!1},e))}),T=n(),E={x:0,y:0,active:!1};function D(){(0,y.useEffect)(()=>{let e=e=>{e.pointerType===`mouse`&&(E.x=e.clientX/window.innerWidth*2-1,E.y=e.clientY/window.innerHeight*2-1,E.active=!0)},t=e=>{e.gamma!=null&&e.beta!=null&&(E.x=_.clamp(e.gamma/45,-1,1),E.y=_.clamp((e.beta-50)/60,-1,1),E.active=!0)};return window.addEventListener(`pointermove`,e,{passive:!0}),window.addEventListener(`deviceorientation`,t,{passive:!0}),()=>{window.removeEventListener(`pointermove`,e),window.removeEventListener(`deviceorientation`,t)}},[])}function O(e){let t=l(e=>e.viewport).height/1.3;return{w:t*e,h:t}}var k=`
  uniform sampler2D uDepth;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += (texture2D(uDepth, uv).r - 0.45) * 0.9;   // real body depth (never rendered)
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`,A=`
  uniform sampler2D uMap;
  varying vec2 vUv;
  void main() {
    float a = texture2D(uMap, vUv).a * smoothstep(0.0, 0.2, vUv.y);
    if (a < 0.5) discard;
    gl_FragColor = vec4(0.0);
  }
`;function j({map:e,depth:t,aspect:n}){let{w:r,h:i}=O(n),a=(0,y.useMemo)(()=>({uMap:{value:e},uDepth:{value:t}}),[e,t]);return(0,T.jsxs)(`mesh`,{renderOrder:-1,children:[(0,T.jsx)(`planeGeometry`,{args:[r,i,90,Math.round(90/n)]}),(0,T.jsx)(`shaderMaterial`,{vertexShader:k,fragmentShader:A,uniforms:a,colorWrite:!1})]})}var M=`
  uniform sampler2D uMap;
  uniform sampler2D uDepth;
  uniform float uReveal;
  varying vec2 vUv;
  void main() {
    float a = texture2D(uMap, vUv).a * smoothstep(0.0, 0.2, vUv.y);
    float line = uReveal * 1.3 - 0.15;
    float band = smoothstep(0.035, 0.0, abs(vUv.y - line));
    float glow = band * (0.55 + 0.45 * texture2D(uDepth, vUv).r);  // follows the body's relief
    vec3 col = vec3(1.0, 0.82, 0.15) * glow;
    gl_FragColor = vec4(col, glow * a * 0.85);
    #include <colorspace_fragment>
  }
`;function N({map:e,depth:t,aspect:n,onDone:r}){let{w:i,h:a}=O(n),o=(0,y.useRef)(null),s=(0,y.useRef)(null),c=(0,y.useRef)(!1),l=(0,y.useMemo)(()=>({uMap:{value:e},uDepth:{value:t},uReveal:{value:0}}),[e,t]);return p(e=>{if(!o.current||c.current)return;s.current===null&&(s.current=e.clock.elapsedTime+.9);let t=_.clamp((e.clock.elapsedTime-s.current)/2.2,0,1);o.current.uniforms.uReveal.value=t*t*(3-2*t),t>=1&&(c.current=!0,r())}),(0,T.jsxs)(`mesh`,{position:[0,0,.01],renderOrder:10,children:[(0,T.jsx)(`planeGeometry`,{args:[i,a]}),(0,T.jsx)(`shaderMaterial`,{ref:o,vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:M,uniforms:l,transparent:!0,depthTest:!1,depthWrite:!1,blending:2,toneMapped:!1})]})}function P({mapUrl:e,depthUrl:t,aspect:n,reduced:r,lowPower:a,coarse:o,onReady:s}){let[c,l]=d(i,[e,t]),[u,f]=(0,y.useState)(!r);return(0,y.useMemo)(()=>{l.colorSpace=``,l.minFilter=l.magFilter=g},[l]),(0,y.useEffect)(()=>{let e=requestAnimationFrame(()=>s());return()=>cancelAnimationFrame(e)},[s]),(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(j,{map:c,depth:l,aspect:n}),u&&(0,T.jsx)(N,{map:c,depth:l,aspect:n,onDone:()=>f(!1)}),(0,T.jsxs)(H,{reduced:r,coarse:o,children:[(0,T.jsx)(R,{count:a?8:12}),(0,T.jsx)(V,{count:a?360:700,map:c,aspect:n})]})]})}var F=`
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`,I=`
  uniform vec3 uColor;
  uniform float uGlow;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
    vec3 body = vec3(0.03, 0.07, 0.18);
    vec3 col = mix(body, uColor * uGlow, f);
    gl_FragColor = vec4(col, 0.35 + f * 0.65);
    #include <colorspace_fragment>
  }
`;function L(e){let t=7,n=()=>(t=t*16807%2147483647)/2147483647,r=[];for(let t=0;t<e;t++){let i=(t%2==0?-1:1)*(1.05+n()*.5),a=-1.1+t/e*2.6+(n()-.5)*.3,o=-.9+n()*1.5;r.push({pos:[i,a,o],rot:[n()*Math.PI,n()*Math.PI,n()*Math.PI],size:.2+n()*.2,yellow:n()>.55})}return r}function R({count:e}){let t=(0,y.useMemo)(()=>L(e),[e]),n=(0,y.useMemo)(()=>{let e=(e,t)=>new a({vertexShader:F,fragmentShader:I,uniforms:{uColor:{value:new f(e)},uGlow:{value:t}},transparent:!0,depthWrite:!1,toneMapped:!1});return{yellow:e(`#ffd400`,1.25),blue:e(`#4aa8ff`,1.15)}},[]);return(0,y.useEffect)(()=>()=>Object.values(n).forEach(e=>e.dispose()),[n]),(0,T.jsx)(`group`,{children:t.map((e,t)=>(0,T.jsx)(w,{speed:1+t%3*.35,rotationIntensity:.9,floatIntensity:.6,children:(0,T.jsx)(S,{args:[e.size,e.size,e.size*.28],radius:e.size*.12,smoothness:3,position:e.pos,rotation:e.rot,material:e.yellow?n.yellow:n.blue})},t))})}var z=`
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uRect;    // photo size at z = 0
  uniform float uCamZ;
  varying float vSeed;
  varying vec2 vPhotoUv;
  void main() {
    vSeed = aSeed;
    float a = position.x + uTime * (0.12 + aSeed * 0.18);
    float r = position.y;
    vec3 p = vec3(cos(a) * r, position.z + sin(uTime * 0.6 + aSeed * 6.28) * 0.04, sin(a) * r * 0.55);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vPhotoUv = world.xy * (uCamZ / (uCamZ - world.z)) / uRect + 0.5;   // where it lands on the photo
    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + aSeed * 3.5) * uPixelRatio * (4.0 / -mv.z);
  }
`,B=`
  uniform sampler2D uMap;
  varying float vSeed;
  varying vec2 vPhotoUv;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec2 inside = step(vec2(0.0), vPhotoUv) * step(vPhotoUv, vec2(1.0));
    a *= 1.0 - 0.85 * texture2D(uMap, vPhotoUv).a * inside.x * inside.y;  // never "dots on the shirt"
    vec3 c = mix(vec3(0.35, 0.72, 1.0), vec3(1.0, 0.85, 0.1), step(0.78, vSeed));
    gl_FragColor = vec4(c, a * 0.8);
    #include <colorspace_fragment>
  }
`;function V({count:e,map:t,aspect:n}){let i=(0,y.useRef)(null),a=l(e=>e.viewport.dpr),{w:o,h:s}=O(n),c=(0,y.useMemo)(()=>{let t=new u,n=new Float32Array(e*3),r=new Float32Array(e);for(let t=0;t<e;t++)n[t*3]=Math.random()*Math.PI*2,n[t*3+1]=1.05+Math.random()*.55,n[t*3+2]=-.45+(Math.random()-.5)*.3,r[t]=Math.random();return t.setAttribute(`position`,new m(n,3)),t.setAttribute(`aSeed`,new m(r,1)),t},[e]),d=(0,y.useMemo)(()=>({uTime:{value:0},uPixelRatio:{value:a},uMap:{value:t},uRect:{value:new r(o,s)},uCamZ:{value:6}}),[a,t,o,s]);return p((e,t)=>{i.current&&(i.current.uniforms.uTime.value+=t)}),(0,T.jsx)(`points`,{geometry:c,rotation:[.1,0,-.06],children:(0,T.jsx)(`shaderMaterial`,{ref:i,vertexShader:z,fragmentShader:B,uniforms:d,transparent:!0,depthWrite:!1,toneMapped:!1})})}function H({children:e,reduced:t,coarse:n}){let r=(0,y.useRef)(null);return D(),p(e=>{if(!r.current||t)return;let i=e.clock.elapsedTime,a=E.active?E.x*.35:n?Math.sin(i*.45)*.2:0,o=E.active?E.y*.12:0;r.current.rotation.y=_.lerp(r.current.rotation.y,a,.05),r.current.rotation.x=_.lerp(r.current.rotation.x,o,.05)}),(0,T.jsx)(`group`,{ref:r,children:e})}function U({map:e,depth:t,aspect:n,active:r,reduced:i,lowPower:a,onReady:o}){let s=typeof window<`u`&&window.matchMedia(`(pointer: coarse)`).matches;return(0,T.jsx)(h,{dpr:[1,a?1.5:2],gl:{antialias:!0,alpha:!0,powerPreference:`high-performance`},camera:{position:[0,0,6],fov:34},frameloop:r?`always`:`never`,onCreated:({gl:e})=>{e.setClearColor(0,0),e.toneMapping=0},style:{pointerEvents:`none`},"aria-hidden":`true`,children:(0,T.jsx)(y.Suspense,{fallback:null,children:(0,T.jsx)(P,{mapUrl:e,depthUrl:t,aspect:n,reduced:i,lowPower:a,coarse:s,onReady:o})})})}export{U as default};