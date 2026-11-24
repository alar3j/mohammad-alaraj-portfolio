import{E as e,c as t,k as n}from"./ui-COSXJvrb.js";import{S as r,T as i,a,b as o,c as s,i as c,l,m as u,n as d,o as f,p,s as m,t as h,u as g,w as _,x as v,y}from"./dist-DmIwFkJ2.js";function b(e,t=Math.PI/3){let n=Math.cos(t),r=(1+1e-10)*100,i=[new _,new _,new _],a=new _,o=new _,c=new _,l=new _;function u(e){return`${~~(e.x*r)},${~~(e.y*r)},${~~(e.z*r)}`}let d=e.index?e.toNonIndexed():e,f=d.attributes.position,p={};for(let e=0,t=f.count/3;e<t;e++){let t=3*e,n=i[0].fromBufferAttribute(f,t+0),r=i[1].fromBufferAttribute(f,t+1),s=i[2].fromBufferAttribute(f,t+2);a.subVectors(s,r),o.subVectors(n,r);let c=new _().crossVectors(a,o).normalize();for(let e=0;e<3;e++){let t=i[e],n=u(t);n in p||(p[n]=[]),p[n].push(c)}}let m=new Float32Array(f.count*3),h=new s(m,3,!1);for(let e=0,t=f.count/3;e<t;e++){let t=3*e,r=i[0].fromBufferAttribute(f,t+0),s=i[1].fromBufferAttribute(f,t+1),d=i[2].fromBufferAttribute(f,t+2);a.subVectors(d,s),o.subVectors(r,s),c.crossVectors(a,o).normalize();for(let e=0;e<3;e++){let r=i[e],a=p[u(r)];l.set(0,0,0);for(let e=0,t=a.length;e<t;e++){let t=a[e];c.dot(t)>n&&l.add(t)}l.normalize(),h.setXYZ(t+e,l.x,l.y,l.z)}}return d.setAttribute(`normal`,h),d}var x=n(e()),S=1e-5;function C(e,t,n){let r=new v,i=n-S;return r.absarc(S,S,S,-Math.PI/2,-Math.PI,!0),r.absarc(S,t-i*2,S,Math.PI,Math.PI/2,!0),r.absarc(e-i*2,t-i*2,S,Math.PI/2,0,!0),r.absarc(e-i*2,S,S,0,-Math.PI/2,!0),r}var w=x.forwardRef(function({args:[e=1,t=1,n=1]=[],radius:r=.05,steps:a=1,smoothness:o=4,bevelSegments:s=4,creaseAngle:c=.4,children:l,...u},d){return x.createElement(`mesh`,i({ref:d},u),x.createElement(T,{args:[e,t,n],radius:r,steps:a,smoothness:o,bevelSegments:s,creaseAngle:c}),l)}),T=x.forwardRef(function({args:[e=1,t=1,n=1]=[],radius:r=.05,steps:a=1,smoothness:o=4,bevelSegments:s=4,creaseAngle:c=.4,...l},u){let d=x.useMemo(()=>C(e,t,r),[e,t,r]),f=x.useMemo(()=>({depth:n-r*2,bevelEnabled:!0,bevelSegments:s*2,steps:a,bevelSize:r-S,bevelThickness:r,curveSegments:o}),[n,r,o,s,a]),p=x.useRef(null);return x.useLayoutEffect(()=>{p.current&&(p.current.center(),b(p.current,c))},[d,f,c]),x.useImperativeHandle(u,()=>p.current),x.createElement(`extrudeGeometry`,i({ref:p,args:[d,f]},l))}),E=x.forwardRef(({children:e,enabled:t=!0,speed:n=1,rotationIntensity:r=1,floatIntensity:i=1,floatingRange:o=[-.1,.1],autoInvalidate:s=!1,...c},l)=>{let d=x.useRef(null);x.useImperativeHandle(l,()=>d.current,[]);let f=x.useRef(Math.random()*1e4);return a(e=>{if(!t||n===0)return;s&&e.invalidate();let a=f.current+e.clock.elapsedTime;d.current.rotation.x=Math.cos(a/4*n)/8*r,d.current.rotation.y=Math.sin(a/4*n)/8*r,d.current.rotation.z=Math.sin(a/4*n)/20*r;let c=Math.sin(a/4*n)/10;c=u.mapLinear(c,-.1,.1,o?.[0]??-.1,o?.[1]??.1),d.current.position.y=c*i,d.current.updateMatrix()}),x.createElement(`group`,c,x.createElement(`group`,{ref:d,matrixAutoUpdate:!1},e))}),D=t(),O={x:0,y:0,active:!1};function k(){(0,x.useEffect)(()=>{let e=e=>{e.pointerType===`mouse`&&(O.x=e.clientX/window.innerWidth*2-1,O.y=e.clientY/window.innerHeight*2-1,O.active=!0)},t=e=>{e.gamma!=null&&e.beta!=null&&(O.x=u.clamp(e.gamma/30,-1,1),O.y=u.clamp((e.beta-45)/40,-1,1),O.active=!0)};return window.addEventListener(`pointermove`,e,{passive:!0}),window.addEventListener(`deviceorientation`,t,{passive:!0}),()=>{window.removeEventListener(`pointermove`,e),window.removeEventListener(`deviceorientation`,t)}},[])}var A=`
  uniform sampler2D uDepth;
  uniform float uDepthScale;
  uniform float uReveal;
  uniform float uTime;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    float d = texture2D(uDepth, uv).r;
    vDepth = d;
    vec3 p = position;
    p.z += (d - 0.55) * uDepthScale;
    // before the scan passes, the hologram breathes slightly
    float pending = step(uReveal * 1.25 - 0.12, uv.y);
    p.z += pending * sin(uv.y * 40.0 + uTime * 3.0) * 0.015;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`,j=`
  uniform sampler2D uMap;
  uniform float uReveal;
  uniform float uTime;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float line = uReveal * 1.25 - 0.12;
    float shown = smoothstep(line + 0.004, line - 0.004, vUv.y);
    float scan = smoothstep(0.03, 0.0, abs(vUv.y - line)) * step(uReveal, 0.999);

    // hologram: depth-shaded blue with horizontal scan lines
    float lines = 0.55 + 0.45 * sin(vUv.y * 420.0 - uTime * 6.0);
    vec3 holo = vec3(0.08, 0.32, 1.0) * (0.25 + vDepth * 1.1) * lines;

    vec3 col = mix(holo, tex.rgb, shown) + vec3(1.0, 0.78, 0.1) * scan * 2.6;
    float alpha = tex.a * mix(0.75, 1.0, shown);
    alpha *= smoothstep(0.0, 0.2, vUv.y);          // soft fade at the bottom, like the original
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;function M({map:e,depth:t,aspect:n,reduced:i,segments:o,onReady:s}){let[c,l]=f(r,[e,t]),d=m(e=>e.viewport),h=(0,x.useRef)(null),g=(0,x.useRef)(null);(0,x.useMemo)(()=>{c.colorSpace=y,c.anisotropy=4,l.colorSpace=``,l.minFilter=l.magFilter=p},[c,l]);let _=(0,x.useMemo)(()=>({uMap:{value:c},uDepth:{value:l},uDepthScale:{value:1.15},uReveal:{value:+!!i},uTime:{value:0}}),[c,l,i]),v=d.height/1.3,b=v*n;return(0,x.useEffect)(()=>{let e=requestAnimationFrame(()=>s());return()=>cancelAnimationFrame(e)},[s]),a((e,t)=>{if(!h.current)return;let n=h.current.uniforms;n.uTime.value+=t,g.current===null&&(g.current=e.clock.elapsedTime+1.1);let r=u.clamp((e.clock.elapsedTime-g.current)/2.6,0,1);n.uReveal.value=i?1:r*r*(3-2*r)}),(0,D.jsxs)(`mesh`,{position:[0,-d.height*.02,0],children:[(0,D.jsx)(`planeGeometry`,{args:[b,v,o,Math.round(o/n)]}),(0,D.jsx)(`shaderMaterial`,{ref:h,vertexShader:A,fragmentShader:j,uniforms:_,transparent:!0,toneMapped:!1})]})}var N=`
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`,P=`
  uniform vec3 uColor;
  uniform float uGlow;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
    vec3 body = vec3(0.02, 0.05, 0.13);
    vec3 col = mix(body, uColor * uGlow, f);
    gl_FragColor = vec4(col, 0.22 + f * 0.78);
    #include <colorspace_fragment>
  }
`;function F(e){let t=7,n=()=>(t=t*16807%2147483647)/2147483647,r=[];for(let t=0;t<e;t++){let i=(t%2==0?-1:1)*(.95+n()*.55),a=-1.15+t/e*2.7+(n()-.5)*.35,o=-.9+n()*1.5;r.push({pos:[i,a,o],rot:[n()*Math.PI,n()*Math.PI,n()*Math.PI],size:.2+n()*.22,yellow:n()>.55})}return r}function I({count:e,scale:t}){let n=(0,x.useMemo)(()=>F(e),[e]),r=(0,x.useMemo)(()=>({yellow:new o({vertexShader:N,fragmentShader:P,uniforms:{uColor:{value:new g(`#ffd400`)},uGlow:{value:2.2}},transparent:!0,depthWrite:!1,toneMapped:!1}),blue:new o({vertexShader:N,fragmentShader:P,uniforms:{uColor:{value:new g(`#3b9bff`)},uGlow:{value:2}},transparent:!0,depthWrite:!1,toneMapped:!1})}),[]);return(0,x.useEffect)(()=>()=>Object.values(r).forEach(e=>e.dispose()),[r]),(0,D.jsx)(`group`,{scale:t,children:n.map((e,t)=>(0,D.jsx)(E,{speed:1+t%3*.35,rotationIntensity:.9,floatIntensity:.7,children:(0,D.jsx)(w,{args:[e.size,e.size,e.size*.28],radius:e.size*.12,smoothness:3,position:e.pos,rotation:e.rot,material:e.yellow?r.yellow:r.blue})},t))})}var L=`
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vSeed;
  void main() {
    vSeed = aSeed;
    float a = position.x + uTime * (0.12 + aSeed * 0.18);
    float r = position.y;
    vec3 p = vec3(cos(a) * r, position.z + sin(uTime * 0.6 + aSeed * 6.28) * 0.04, sin(a) * r * 0.42);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + aSeed * 4.0) * uPixelRatio * (4.0 / -mv.z);
  }
`,R=`
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 c = mix(vec3(0.25, 0.65, 1.0), vec3(1.0, 0.83, 0.0), step(0.78, vSeed));
    gl_FragColor = vec4(c * 1.8, a * 0.7);
    #include <colorspace_fragment>
  }
`;function z({count:e}){let t=(0,x.useRef)(null),n=m(e=>e.viewport.dpr),r=(0,x.useMemo)(()=>{let t=new l,n=new Float32Array(e*3),r=new Float32Array(e);for(let t=0;t<e;t++)n[t*3]=Math.random()*Math.PI*2,n[t*3+1]=.95+Math.random()*.6,n[t*3+2]=-.35+(Math.random()-.5)*.35,r[t]=Math.random();return t.setAttribute(`position`,new s(n,3)),t.setAttribute(`aSeed`,new s(r,1)),t},[e]),i=(0,x.useMemo)(()=>({uTime:{value:0},uPixelRatio:{value:n}}),[n]);return a((e,n)=>{t.current&&(t.current.uniforms.uTime.value+=n)}),(0,D.jsx)(`points`,{geometry:r,rotation:[.12,0,-.08],children:(0,D.jsx)(`shaderMaterial`,{ref:t,vertexShader:L,fragmentShader:R,uniforms:i,transparent:!0,depthWrite:!1,blending:2,toneMapped:!1})})}function B({children:e,reduced:t,coarse:n}){let r=(0,x.useRef)(null);return k(),a(e=>{if(!r.current||t)return;let i=e.clock.elapsedTime,a=O.active?O.x*.32:n?Math.sin(i*.45)*.16:0,o=O.active?O.y*.12:n?Math.sin(i*.3)*.04:0;r.current.rotation.y=u.lerp(r.current.rotation.y,a,.06),r.current.rotation.x=u.lerp(r.current.rotation.x,o,.06)}),(0,D.jsx)(`group`,{ref:r,children:e})}function V(){let e=(0,x.useMemo)(()=>new o({transparent:!0,depthWrite:!1,toneMapped:!1,blending:2,vertexShader:`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,fragmentShader:`
          varying vec2 vUv;
          void main() {
            float d = length(vUv - vec2(0.5, 0.5));
            float a = pow(smoothstep(0.5, 0.0, d), 1.6);
            gl_FragColor = vec4(vec3(0.09, 0.3, 0.95) * a * 0.75, 1.0);
            #include <colorspace_fragment>
          }
        `}),[]);return(0,D.jsx)(`mesh`,{position:[0,.05,-1.4],material:e,children:(0,D.jsx)(`planeGeometry`,{args:[3.9,4.4]})})}function H({map:e,depth:t,aspect:n,active:r,reduced:i,lowPower:a,onReady:o}){let s=typeof window<`u`&&window.matchMedia(`(pointer: coarse)`).matches;return(0,D.jsxs)(c,{dpr:[1,a?1.5:2],gl:{antialias:!a,alpha:!1,powerPreference:`high-performance`},camera:{position:[0,0,6],fov:34},frameloop:r?`always`:`never`,onCreated:({gl:e})=>{e.setClearColor(`#05080f`,1),e.toneMapping=0},"aria-hidden":`true`,children:[(0,D.jsxs)(x.Suspense,{fallback:null,children:[(0,D.jsx)(V,{}),(0,D.jsxs)(B,{reduced:i,coarse:s,children:[(0,D.jsx)(M,{map:e,depth:t,aspect:n,reduced:i,segments:a?110:170,onReady:o}),(0,D.jsx)(I,{count:a?8:12,scale:1}),(0,D.jsx)(z,{count:a?380:800})]})]}),!a&&(0,D.jsx)(d,{multisampling:0,children:(0,D.jsx)(h,{mipmapBlur:!0,intensity:.9,luminanceThreshold:1.05,luminanceSmoothing:.05})})]})}export{H as default};