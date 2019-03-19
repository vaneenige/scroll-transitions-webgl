function getRandomBetween(value) {
  const floor = -value;
  return floor + Math.random() * value * 2;
}

function getArrayWithNoise(array, noise) {
  return array.map(item => item + getRandomBetween(noise));
}

function getRandomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function createInstance({ rainbow = false, geometry, material, multiplier, duration, points }) {
  const attributes = [
    {
      name: 'aPositionStart',
      data: points[0],
      size: 3,
    },
    {
      name: 'aControlPointOne',
      data: points[1],
      size: 3,
    },
    {
      name: 'aControlPointTwo',
      data: points[2],
      size: 3,
    },
    {
      name: 'aPositionEnd',
      data: points[3],
      size: 3,
    },
    {
      name: 'aOffset',
      data: i => [i * ((1 - duration) / (multiplier - 1))],
      size: 1,
    },
  ];

  if (rainbow) {
    attributes.push({
      name: 'aColor',
      data: (i, total) => {
        const color = new THREE.Color();
        color.setHSL(i / total, 0.6, 0.7);
        return [color.r, color.g, color.b];
      },
      size: 3,
    });
  }

  const uniforms = {
    time: {
      value: 0,
    },
  };

  const vertex = `
    attribute vec3 aPositionStart;
    attribute vec3 aControlPointOne;
    attribute vec3 aControlPointTwo;
    attribute vec3 aPositionEnd;
    attribute float aOffset;
    uniform float time;
    ${rainbow ? `attribute vec3 aColor; varying vec3 vColor;` : ``}

    float easeInOutSin(float t){
      return (1.0 + sin(${Math.PI} * t - ${Math.PI} / 2.0)) / 2.0;
    }

    vec4 quatFromAxisAngle(vec3 axis, float angle) {
      float halfAngle = angle * 0.5;
      return vec4(axis.xyz * sin(halfAngle), cos(halfAngle));
    }

    vec3 rotateVector(vec4 q, vec3 v) {
      return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
    }

    vec3 bezier4(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
      return mix(mix(mix(a, b, t), mix(b, c, t), t), mix(mix(b, c, t), mix(c, d, t), t), t);
    }

    void main(){
      float tProgress = easeInOutSin(min(1.0, max(0.0, (time - aOffset)) / ${duration}));
      vec4 quatX = quatFromAxisAngle(vec3(1.0, 0.0, 0.0), -5.0 * tProgress);
      vec4 quatY = quatFromAxisAngle(vec3(0.0, 1.0, 0.0), -5.0 * tProgress);
      vec3 basePosition = rotateVector(quatX, rotateVector(quatY, position));
      vec3 newPosition = bezier4(aPositionStart, aControlPointOne, aControlPointTwo, aPositionEnd, tProgress);
      float scale = tProgress * 2.0 - 1.0;
      scale = 1.0 - scale * scale;
      basePosition *= scale;
      gl_Position = basePosition + newPosition;
      ${rainbow ? `vColor = aColor;` : ``}
    }
  `;

  const fragment = rainbow
    ? [
        ['#define PHONG', 'varying vec3 vColor;'],
        ['vec4( diffuse, opacity )', 'vec4( vColor, opacity )'],
        ['vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = vColor;'],
      ]
    : [];

  const instance = new THREE.Phenomenon({
    attributes,
    uniforms,
    vertex,
    geometry,
    multiplier,
    material,
    fragment,
  });

  scene.add(instance.mesh);
  return instance;
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
});

renderer.setClearColor(0x212121, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio >= 2 ? 2 : 1);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 20 * 1, 35 * 1);
camera.lookAt(scene.position);
scene.add(camera);

const ambientLight = new THREE.AmbientLight('#ffffff', 0.1);
scene.add(ambientLight);

const light = new THREE.SpotLight(0xffffff, 1, 80, Math.PI * 0.25, 1, 2);
light.position.set(0, 40, 0);

scene.add(light);

function render() {
  renderer.render(scene, camera);
}

function hcfp(percent) {
  return `#${new THREE.Color().setHSL(percent, 0.5, 0.5).getHexString()}`;
}

const instances = [
  createInstance({
    geometry: new THREE.IcosahedronGeometry(1, 0),
    material: new THREE.MeshPhongMaterial({
      emissive: hcfp(0),
      specular: '#efefef',
      shininess: 20,
      flatShading: true,
    }),
    multiplier: 200,
    duration: 0.7,
    points: [
      () => getArrayWithNoise([0, 0, 0], 10),
      () => getArrayWithNoise([0, 0, 0], 8),
      () => getArrayWithNoise([0, 0, 0], 2),
      () => getArrayWithNoise([0, 0, 0], 12),
    ],
  }),
  createInstance({
    geometry: new THREE.BoxGeometry(1, 1, 1),
    material: new THREE.MeshPhongMaterial({
      emissive: hcfp(0.5 / 3),
      specular: '#efefef',
      shininess: 20,
      flatShading: true,
    }),
    multiplier: 200,
    duration: 0.4,
    points: [
      () => getArrayWithNoise([-10, 0, 0], 4),
      () => getArrayWithNoise([-2.5, -10, 0], 4),
      () => getArrayWithNoise([2.5, 10, 0], 4),
      () => getArrayWithNoise([10, 0, 0], 4),
    ],
  }),
  createInstance({
    geometry: new THREE.TetrahedronGeometry(1),
    material: new THREE.MeshPhongMaterial({
      emissive: hcfp(1.5 / 3),
      specular: '#efefef',
      shininess: 20,
      flatShading: true,
    }),
    multiplier: 400,
    duration: 0.4,
    points: [
      () => getArrayWithNoise([0, 10, 0], 10),
      () => getArrayWithNoise([0, 0, 0], 10),
      () => getArrayWithNoise([0, 0, 0], 10),
      () => getArrayWithNoise([0, -10, 0], 10),
    ],
  }),
  createInstance({
    rainbow: true,
    geometry: new THREE.IcosahedronGeometry(0.8, 3),
    material: new THREE.MeshPhongMaterial({
      emissive: hcfp(2 / 3),
      specular: '#efefef',
      shininess: 20,
      flatShading: true,
    }),
    multiplier: 400,
    duration: 0.4,
    points: [
      () => getArrayWithNoise([0, -20, 0], 0),
      () => getArrayWithNoise([0, 10, 0], 0),
      () => getArrayWithNoise([0, -10, 0], 10),
      () => getArrayWithNoise([0, 15, 0], 15),
    ],
  }),
];

const headings = document.querySelectorAll('.heading');
const header = document.querySelector('.header');

uos(0, 1, p => render());

uos(0, 0.05, p => (header.style.opacity = 1 - p));

const step = 1 / instances.length;
for (let i = 0; i < instances.length; i += 1) {
  const transitionBegin = i * step;
  const transitionEnd = transitionBegin + step * 0.5;
  const textEnd = (i + 1) * step;
  uos(transitionBegin, transitionEnd, p => (instances[i].uniforms.time.value = p));
  uos(transitionEnd, textEnd, p => {
    let np = p * 2.0 - 1.0;
    np = 1.0 - np * np;
    headings[i].style.opacity = i === instances.length - 1 ? p * 1.5 : np * 1.5;
  });
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  const divs = document.querySelectorAll('.heading');
  for (let i = 0; i < divs.length; i += 1) {
    divs[i].style.height = `${window.innerHeight}px`;
  }
  render();
}

requestAnimationFrame(() => {
  window.scrollTo(0, 0);
  resize();
  header.style.opacity = 1;
});

window.addEventListener('resize', resize, false);
