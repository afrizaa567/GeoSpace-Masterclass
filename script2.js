THREE.OrbitControls = function(camera, domElement) {
    this.camera = camera; this.domElement = domElement;
    this.enabled = true; this.enableDamping = false; this.dampingFactor = 0.05;
    this.enableZoom = true; this.enableRotate = true; this.enablePan = true;
    var scope = this;
    var STATE = { NONE:-1, ROTATE:0, DOLLY:1, PAN:2, TOUCH_ROTATE:3, TOUCH_PAN:4, TOUCH_DOLLY_PAN:5 };
    var state = STATE.NONE;
    var EPS = 0.000001;
    var spherical = new THREE.Spherical(); var sphericalDelta = new THREE.Spherical();
    var scale = 1; var panOffset = new THREE.Vector3();
    var rotateStart = new THREE.Vector2(); var rotateEnd = new THREE.Vector2(); var rotateDelta = new THREE.Vector2();
    var panStart = new THREE.Vector2(); var panEnd = new THREE.Vector2(); var panDelta = new THREE.Vector2();
    var dollyStart = new THREE.Vector2(); var dollyEnd = new THREE.Vector2(); var dollyDelta = new THREE.Vector2();
    var target = new THREE.Vector3();
    this.target = target;
    var lastPosition = new THREE.Vector3(); var lastQuaternion = new THREE.Quaternion();
    var quat = new THREE.Quaternion().setFromUnitVectors(camera.up, new THREE.Vector3(0,1,0));
    var quatInverse = quat.clone().invert();
    var offset = new THREE.Vector3();
    function getZoomScale() { return Math.pow(0.95, 1); }
    function rotateLeft(angle) { sphericalDelta.theta -= angle; }
    function rotateUp(angle) { sphericalDelta.phi -= angle; }
    var panLeftV = new THREE.Vector3();
    function panLeft(distance, objectMatrix) { panLeftV.setFromMatrixColumn(objectMatrix, 0); panLeftV.multiplyScalar(-distance); panOffset.add(panLeftV); }
    var panUpV = new THREE.Vector3();
    function panUp(distance, objectMatrix) { panUpV.setFromMatrixColumn(objectMatrix, 1); panUpV.multiplyScalar(distance); panOffset.add(panUpV); }
    var panInternalV = new THREE.Vector3();
    function pan(deltaX, deltaY) {
        var el = scope.domElement;
        panInternalV.copy(camera.position).sub(target);
        var targetDistance = panInternalV.length();
        targetDistance *= Math.tan((camera.fov/2) * Math.PI / 180);
        panLeft(2 * deltaX * targetDistance / el.clientHeight, camera.matrix);
        panUp(2 * deltaY * targetDistance / el.clientHeight, camera.matrix);
    }
    function dollyIn(dollyScale) { scale /= dollyScale; }
    function dollyOut(dollyScale) { scale *= dollyScale; }
    this.update = function() {
        offset.copy(camera.position).sub(target);
        offset.applyQuaternion(quat);
        spherical.setFromVector3(offset);
        spherical.theta += sphericalDelta.theta; spherical.phi += sphericalDelta.phi;
        spherical.phi = Math.max(EPS, Math.min(Math.PI - EPS, spherical.phi));
        spherical.radius *= scale; spherical.radius = Math.max(1, Math.min(1000, spherical.radius));
        target.add(panOffset);
        offset.setFromSpherical(spherical); offset.applyQuaternion(quatInverse);
        camera.position.copy(target).add(offset); camera.lookAt(target);
        if (scope.enableDamping) { sphericalDelta.theta *= (1-scope.dampingFactor); sphericalDelta.phi *= (1-scope.dampingFactor); panOffset.multiplyScalar(1-scope.dampingFactor); }
        else { sphericalDelta.set(0,0,0); panOffset.set(0,0,0); }
        scale = 1;
        if (lastPosition.distanceToSquared(camera.position) > EPS || 8*(1-lastQuaternion.dot(camera.quaternion)) > EPS) { lastPosition.copy(camera.position); lastQuaternion.copy(camera.quaternion); return true; }
        return false;
    };
    function onMouseDown(e) {
        if (!scope.enabled) return; e.preventDefault();
        if (e.button===0) { state=STATE.ROTATE; rotateStart.set(e.clientX, e.clientY); }
        else if (e.button===1) { state=STATE.DOLLY; dollyStart.set(e.clientX, e.clientY); }
        else if (e.button===2) { state=STATE.PAN; panStart.set(e.clientX, e.clientY); }
        document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
    }
    function onMouseMove(e) {
        if (!scope.enabled) return;
        if (state===STATE.ROTATE) { rotateEnd.set(e.clientX,e.clientY); rotateDelta.subVectors(rotateEnd,rotateStart).multiplyScalar(0.5*Math.PI/180*5); rotateLeft(2*Math.PI*rotateDelta.x/scope.domElement.clientHeight); rotateUp(2*Math.PI*rotateDelta.y/scope.domElement.clientHeight); rotateStart.copy(rotateEnd); }
        else if (state===STATE.DOLLY) { dollyEnd.set(e.clientX,e.clientY); dollyDelta.subVectors(dollyEnd,dollyStart); if(dollyDelta.y>0) dollyIn(getZoomScale()); else if(dollyDelta.y<0) dollyOut(getZoomScale()); dollyStart.copy(dollyEnd); }
        else if (state===STATE.PAN) { panEnd.set(e.clientX,e.clientY); panDelta.subVectors(panEnd,panStart).multiplyScalar(1); pan(panDelta.x,panDelta.y); panStart.copy(panEnd); }
        scope.update();
    }
    function onMouseUp() { document.removeEventListener('mousemove',onMouseMove); document.removeEventListener('mouseup',onMouseUp); state=STATE.NONE; }
    function onWheel(e) { if (!scope.enabled) return; e.preventDefault(); if(e.deltaY<0) dollyOut(getZoomScale()); else if(e.deltaY>0) dollyIn(getZoomScale()); scope.update(); }
    function onTouchStart(e) {
        if (!scope.enabled) return;
        switch(e.touches.length) {
            case 1: state=STATE.TOUCH_ROTATE; rotateStart.set(e.touches[0].pageX, e.touches[0].pageY); break;
            case 2: state=STATE.TOUCH_DOLLY_PAN;
                var dx=e.touches[0].pageX-e.touches[1].pageX; var dy=e.touches[0].pageY-e.touches[1].pageY;
                dollyStart.set(0, Math.sqrt(dx*dx+dy*dy)); break;
        }
    }
    function onTouchMove(e) {
        if (!scope.enabled) return; e.preventDefault();
        switch(e.touches.length) {
            case 1:
                if (state!==STATE.TOUCH_ROTATE) return;
                rotateEnd.set(e.touches[0].pageX, e.touches[0].pageY); rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(0.5*Math.PI/180*5);
                rotateLeft(2*Math.PI*rotateDelta.x/scope.domElement.clientHeight); rotateUp(2*Math.PI*rotateDelta.y/scope.domElement.clientHeight);
                rotateStart.copy(rotateEnd); scope.update(); break;
            case 2:
                if (state!==STATE.TOUCH_DOLLY_PAN) return;
                var dx=e.touches[0].pageX-e.touches[1].pageX; var dy=e.touches[0].pageY-e.touches[1].pageY;
                var dist = Math.sqrt(dx*dx+dy*dy); dollyEnd.set(0, dist); dollyDelta.set(0, Math.pow(dollyEnd.y/dollyStart.y, 1));
                if(dollyDelta.y<1) dollyIn(getZoomScale()); else dollyOut(getZoomScale());
                dollyStart.copy(dollyEnd); scope.update(); break;
        }
    }
    function onTouchEnd() { state = STATE.NONE; }
    function onContextMenu(e) { if (!scope.enabled) return; e.preventDefault(); }
    domElement.addEventListener('contextmenu', onContextMenu); domElement.addEventListener('mousedown', onMouseDown);
    domElement.addEventListener('wheel', onWheel, {passive:false}); domElement.addEventListener('touchstart', onTouchStart, {passive:false});
    domElement.addEventListener('touchend', onTouchEnd); domElement.addEventListener('touchmove', onTouchMove, {passive:false});
    this.update();
};

// ===================== SCENE SETUP =====================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(0, 10, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// ===================== PENCAHAYAAN =====================
const ambientLight = new THREE.AmbientLight(0xfff8e7, 0.4);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(15, 20, 15);
scene.add(dirLight);
const fillLight = new THREE.PointLight(0xffe4b5, 0.5, 80);
fillLight.position.set(-15, -10, 10);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffd580, 0.3);
rimLight.position.set(-8, 5, -15);
scene.add(rimLight);

let isTrans = false;

let glowState = { lastChangeTime: -999, prevFrac: 0, glowDuration: 500 };
function triggerGlow(newFrac) { glowState.lastChangeTime = performance.now(); glowState.prevFrac = newFrac; }
function getGlowProgress() { return Math.max(0, 1 - (performance.now() - glowState.lastChangeTime) / glowState.glowDuration); }

// ===================== KONSTANTA WARNA STANDAR (berlaku semua bangun) =====================
const COLOR_DIM_LABEL   = "#ffdd00"; // label ukuran (r,t,s,p,l,a, dst)
const COLOR_LUAS_ANIM   = 0xffd700;  // animasi luas permukaan (SEMUA bangun)
const COLOR_VOL_ANIM    = 0x38bdf8;  // animasi volume / isi air (SEMUA bangun)
const COLOR_DIAG_BIDANG = 0xffd700;
const COLOR_DIAG_RUANG  = 0xffd700;
const COLOR_BIDANG_DIAGONAL = 0xffd700;

// Material bangun ruang sisi lengkung (warna dasar TIDAK diubah)
const materials = {
    tabung:  new THREE.MeshStandardMaterial({ color: 0x0ea5e9, side: THREE.DoubleSide, roughness: 0.1, metalness: 0.05 }),
    kerucut: new THREE.MeshStandardMaterial({ color: 0x22c55e, side: THREE.DoubleSide, roughness: 0.1, metalness: 0.05 }),
    bola:    new THREE.MeshStandardMaterial({ color: 0xef4444, side: THREE.DoubleSide, roughness: 0.1, metalness: 0.05 })
};
const matHighlight = new THREE.MeshBasicMaterial({ color: 0xffff00 });

// Warna dasar bangun ruang sisi datar (beda dari sisi lengkung & satu sama lain)
const DATAR_COLORS = {
    kubus:  0x8b5cf6,
    balok:  0xf97316,
    prisma: 0xec4899,
    limas:  0x14b8a6
};

let mainGroup = new THREE.Group();
scene.add(mainGroup);
let datarGroup = new THREE.Group();
scene.add(datarGroup);

const hash = (n) => { let x = Math.sin(n) * 43758.5453; return x - Math.floor(x); };

// ===================== ACCORDION =====================
function toggleAccordion(id) {
    const body  = document.getElementById(id);
    const arrow = document.getElementById('arrow-' + id);
    if (!body) return;
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open', !isOpen);
    if (arrow) arrow.classList.toggle('open', !isOpen);
}

// ===================== SHAPE SELECT SYNC =====================
const _shapeDesktop = document.getElementById('shape-select-desktop');
const _shapeMobile  = document.getElementById('shape-select');
function getShapeValue() {
    if (_shapeDesktop && _shapeDesktop.offsetParent !== null) return _shapeDesktop.value;
    if (_shapeMobile  && _shapeMobile.offsetParent  !== null) return _shapeMobile.value;
    return (_shapeDesktop || _shapeMobile).value;
}
const DATAR_SHAPES = ['kubus', 'balok', 'prisma', 'limas'];
function isDatarShape(shape) { return DATAR_SHAPES.indexOf(shape) !== -1; }

const DOM = {
    get shape() { return { value: getShapeValue() }; },
    r:             document.getElementById('radius'),
    t:             document.getElementById('height'),
    net:           document.getElementById('net-slider'),
    pecah:         document.getElementById('pecah-slider'),
    transmute:     document.getElementById('transmute-slider'),
    get btnTrans() { return document.getElementById('btn-trans-desktop') || document.getElementById('btn-trans'); },
    rVal:          document.getElementById('r-val'),
    tVal:          document.getElementById('t-val'),
    p1Val:         document.getElementById('p1-val'),
    pPecahVal:     document.getElementById('p-pecah-val'),
    p2Val:         document.getElementById('p2-val'),
    tGroup:        document.getElementById('t-group'),
    pecahGroup:    document.getElementById('pecah-group'),
    transmuteGroup:document.getElementById('transmute-group'),
    transmuteHint: document.getElementById('transmute-hint'),
    lblNet:        document.getElementById('lbl-net'),
    fLa:           document.getElementById('formula-la'),
    fLs:           document.getElementById('formula-ls'),
    fLp:           document.getElementById('formula-lp'),
    fV:            document.getElementById('formula-v'),
    proofTGroup:   document.getElementById('proof-tabung-group'),
    proofLa:       document.getElementById('proof-la-slider'),
    proofLs:       document.getElementById('proof-ls-slider'),
    proofLp:       document.getElementById('proof-lp-slider'),
    proofVol:      document.getElementById('proof-vol-slider'),
    pLaVal:        document.getElementById('p-la-val'),
    pLsVal:        document.getElementById('p-ls-val'),
    pLpVal:        document.getElementById('p-lp-val'),
    pVolVal:       document.getElementById('p-vol-val'),
    proofKGroup:   document.getElementById('proof-kerucut-group'),
    proofKLa:      document.getElementById('proof-k-la-slider'),
    proofKLs:      document.getElementById('proof-k-ls-slider'),
    proofKLp:      document.getElementById('proof-k-lp-slider'),
    proofKVol:     document.getElementById('proof-k-vol-slider'),
    pkLaVal:       document.getElementById('pk-la-val'),
    pkLsVal:       document.getElementById('pk-ls-val'),
    pkLpVal:       document.getElementById('pk-lp-val'),
    pkVolVal:      document.getElementById('pk-vol-val'),
    proofBGroup:   document.getElementById('proof-bola-group'),
    proofBLp:      document.getElementById('proof-b-lp-slider'),
    proofBVol:     document.getElementById('proof-b-vol-slider'),
    pbLpVal:       document.getElementById('pb-lp-val'),
    pbVolVal:      document.getElementById('pb-vol-val'),

    // ---- Blok panel sisi lengkung vs sisi datar ----
    dimLengkungBlock: document.getElementById('dim-lengkung-block'),
    mathPanel:         document.getElementById('math-panel'),
    netLengkungBlock:  document.getElementById('net-lengkung-block'),

    dimDatarBlock:  document.getElementById('dim-datar-block'),
    mathPanelDatar: document.getElementById('math-panel-datar'),
    fDatarLa: document.getElementById('formula-datar-la'),
    fDatarLp: document.getElementById('formula-datar-lp'),
    fDatarV:  document.getElementById('formula-datar-v'),

    // ---- Dimensi sisi datar ----
    sSlider:  document.getElementById('s-slider'),
    sVal:     document.getElementById('s-val'),
    pSlider:  document.getElementById('p-slider'),
    pVal:     document.getElementById('p-val'),
    lSlider:  document.getElementById('l-slider'),
    lVal:     document.getElementById('l-val'),
    tbSlider: document.getElementById('tb-slider'),
    tbVal:    document.getElementById('tb-val'),
    nMinus:   document.getElementById('n-minus'),
    nPlus:    document.getElementById('n-plus'),
    nVal:     document.getElementById('n-val'),
    aSlider:  document.getElementById('a-slider'),
    aVal:     document.getElementById('a-val'),
    tplSlider:document.getElementById('tpl-slider'),
    tplVal:   document.getElementById('tpl-val'),

    // ---- Diagonal ----
    diagonalGroup: document.getElementById('diagonal-group'),
    hintDiagonal:  document.getElementById('hint-diagonal'),
    btnDiagBidang: document.getElementById('btn-diag-bidang'),
    btnDiagRuang:  document.getElementById('btn-diag-ruang'),
    btnDiagBDiag:  document.getElementById('btn-diag-bdiagonal'),

    // ---- Jaring-jaring & animasi sisi datar ----
    netDatarBlock:  document.getElementById('net-datar-block'),
    netDatarSlider: document.getElementById('net-datar-slider'),
    netDatarVal:    document.getElementById('net-datar-val'),
    animDatarBlock: document.getElementById('anim-datar-block'),
    hintAnimDatar:  document.getElementById('hint-anim-datar'),
    luasDatarSlider:document.getElementById('luas-datar-slider'),
    luasDatarVal:   document.getElementById('luas-datar-val'),
    volDatarSlider: document.getElementById('volume-datar-slider'),
    volDatarVal:    document.getElementById('volume-datar-val'),
    brsdAnimationNav: document.getElementById('brsd-animation-nav'),
    brsdAnimTitle: document.getElementById('brsd-anim-title'),
    animDatarMode: document.getElementById('anim-datar-mode'),
    luasDatarControl: document.getElementById('luas-datar-control'),
    volDatarControl: document.getElementById('volume-datar-control'),
};

const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
function lerpColor(c1, c2, t) {
    return [c1[0]+(c2[0]-c1[0])*t, c1[1]+(c2[1]-c1[1])*t, c1[2]+(c2[2]-c1[2])*t];
}
const clamp01 = v => Math.max(0, Math.min(1, v));
function surfaceFaceProgress(globalProgress, faceIndex, totalFaces) {
    if (globalProgress <= 0) return 0;
    if (globalProgress >= 1) return 1;
    const start = faceIndex / totalFaces;
    const end = (faceIndex + 1) / totalFaces;
    return clamp01((globalProgress - start) / (end - start));
}
function toPlainPoint(v) { return { x: v.x, y: v.y, z: v.z }; }
function pointToVector(p) { return new THREE.Vector3(p.x, p.y, p.z); }
function midpoint3(a, b) { return { x:(a.x+b.x)/2, y:(a.y+b.y)/2, z:(a.z+b.z)/2 }; }
function rotatePointAroundAxis(point, axisStart, axisEnd, angle) {
    const p = pointToVector(point);
    const a = pointToVector(axisStart);
    const axis = pointToVector(axisEnd).sub(a).normalize();
    const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    p.sub(a).applyQuaternion(q).add(a);
    return toPlainPoint(p);
}
function signedAngleAroundAxis(point, axisStart, axisEnd, target) {
    const a = pointToVector(axisStart);
    const axis = pointToVector(axisEnd).sub(a).normalize();
    const from = pointToVector(point).sub(a);
    const to = pointToVector(target).sub(a);
    from.sub(axis.clone().multiplyScalar(from.dot(axis))).normalize();
    to.sub(axis.clone().multiplyScalar(to.dot(axis))).normalize();
    const cross = new THREE.Vector3().crossVectors(from, to);
    return Math.atan2(cross.dot(axis), from.dot(to));
}
function rotatePointTowardAroundAxis(point, axisStart, axisEnd, target, u) {
    const angle = signedAngleAroundAxis(point, axisStart, axisEnd, target);
    return rotatePointAroundAxis(point, axisStart, axisEnd, angle * clamp01(u));
}
function makeQuadFromPoints(p0, p1, p2, p3) { return makeQuadGeometry(p0, p1, p2, p3, p0, p1, p2, p3, 0); }
function makeTriFromPoints(p0, p1, p2) { return makeTriGeometry(p0, p1, p2, p0, p1, p2, 0); }
function addCylinderBetweenPoints(group, p1, p2, radius, colorHex, options={}) {
    const v1 = pointToVector(p1);
    const v2 = pointToVector(p2);
    const delta = v2.clone().sub(v1);
    const length = delta.length();
    if (length <= 0.0001) return null;
    const geom = new THREE.CylinderGeometry(radius, radius, length, options.segments || 18);
    const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: options.emissive === undefined ? colorHex : options.emissive,
        emissiveIntensity: options.emissiveIntensity === undefined ? 0.35 : options.emissiveIntensity,
        roughness: 0.22,
        transparent: !!options.transparent,
        opacity: options.opacity === undefined ? 1 : options.opacity,
        depthWrite: options.depthWrite === undefined ? false : options.depthWrite,
        depthTest: options.depthTest === undefined ? false : options.depthTest
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(v1.add(v2).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    mesh.renderOrder = options.renderOrder || 20;
    group.add(mesh);
    return mesh;
}
function pickReadableBaseEdge(pts) {
    let best = { index: 0, z: -Infinity };
    for (let i = 0; i < pts.length; i++) {
        const p0 = pts[i], p1 = pts[(i + 1) % pts.length];
        const z = (p0.z + p1.z) / 2;
        if (z > best.z) best = { index: i, z };
    }
    return best.index;
}

function oppositeBaseCutPoint(pts, edgeIndex) {
    const n = pts.length;
    if (n % 2 === 1) {
        return pts[(edgeIndex + (n + 1) / 2) % n];
    }
    const oppositeEdge = (edgeIndex + n / 2) % n;
    const p0 = pts[oppositeEdge];
    const p1 = pts[(oppositeEdge + 1) % n];
    return { x: (p0.x + p1.x) / 2, z: (p0.z + p1.z) / 2 };
}

function prismApothemLineStart(pts, edgeIndex) {
    if (pts.length === 3) return oppositeBaseCutPoint(pts, edgeIndex);
    return { x: 0, z: 0 };
}

function addBaseDiagonalDetails(group, pts, y, liftDir) {
    if (!isTrans) return;
    const yLine = y + 0.03;
    const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
        depthTest: false,
        depthWrite: false
    });
    const as3 = p => ({ x: p.x, y: yLine, z: p.z });
    const mid2 = (a, b) => ({ x: (a.x + b.x) / 2, y: yLine, z: (a.z + b.z) / 2 });
    const center = { x: 0, y: yLine, z: 0 };
    const add = (a, b) => {
        const geom = new THREE.BufferGeometry().setFromPoints([pointToVector(a), pointToVector(b)]);
        const line = new THREE.Line(geom, mat.clone());
        line.renderOrder = 60;
        group.add(line);
    };

    if (pts.length === 3) {
        for (let i = 0; i < 3; i++) {
            add(as3(pts[i]), mid2(pts[(i + 1) % 3], pts[(i + 2) % 3]));
        }
        return;
    }
    if (pts.length === 4) {
        add(as3(pts[0]), as3(pts[2]));
        add(as3(pts[1]), as3(pts[3]));
        return;
    }
    for (let i = 0; i < pts.length; i++) {
        add(center, as3(pts[i]));
    }
}

function addPolygonOutline(group, pts3) {
    if (!isTrans || pts3.length < 3) return;
    const vertices = [];
    for (let i = 0; i < pts3.length; i++) {
        const a = pointToVector(pts3[i]);
        const b = pointToVector(pts3[(i + 1) % pts3.length]);
        vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    const line = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
        depthTest: false,
        depthWrite: false
    }));
    line.renderOrder = 55;
    group.add(line);
}

function datarShapeTitle(shape) {
    return {
        kubus: 'Kubus',
        balok: 'Balok',
        prisma: 'Prisma',
        limas: 'Limas'
    }[shape] || 'BRSD';
}
function fracHTML(top, bot) { return "<span class='frac'><span class='top'>" + top + "</span><span class='bot'>" + bot + "</span></span>"; }
function opHTML(text) { return "<span class='math-op'>" + text + "</span>"; }
function varHTML(text) { return "<span class='math-var'>" + text + "</span>"; }

function updateScene() {
    const shape = DOM.shape.value;

    // ===== GATE: kalau shape termasuk sisi datar, alihkan ke sistem baru =====
    if (isDatarShape(shape)) {
        mainGroup.visible = false;
        datarGroup.visible = true;
        while (mainGroup.children.length > 0) mainGroup.remove(mainGroup.children[0]);
        updatePanelVisibilityForShape(shape);
        updateSceneDatar(shape);
        return;
    }
    mainGroup.visible = true;
    datarGroup.visible = false;
    while (datarGroup.children.length > 0) datarGroup.remove(datarGroup.children[0]);
    updatePanelVisibilityForShape(shape);

    while (mainGroup.children.length > 0) mainGroup.remove(mainGroup.children[0]);

    const r           = parseFloat(DOM.r.value);
    const t           = parseFloat(DOM.t.value);
    const p_jeruk     = parseFloat(DOM.net.value) / 100;
    const p_pecah     = parseFloat(DOM.pecah.value) / 100;
    const p_transmute = parseFloat(DOM.transmute.value) / 100;

    const p_la  = DOM.proofLa  ? parseFloat(DOM.proofLa.value)  / 100 : 0;
    const p_ls  = DOM.proofLs  ? parseFloat(DOM.proofLs.value)  / 100 : 0;
    const p_lp  = DOM.proofLp  ? parseFloat(DOM.proofLp.value)  / 100 : 0;
    const p_vol = DOM.proofVol ? parseFloat(DOM.proofVol.value) / 100 : 0;

    const p_la_k  = DOM.proofKLa  ? parseFloat(DOM.proofKLa.value)  / 100 : 0;
    const p_ls_k  = DOM.proofKLs  ? parseFloat(DOM.proofKLs.value)  / 100 : 0;
    const p_lp_k  = DOM.proofKLp  ? parseFloat(DOM.proofKLp.value)  / 100 : 0;
    const p_vol_k = DOM.proofKVol ? parseFloat(DOM.proofKVol.value) : 0;

    const p_b_lp  = DOM.proofBLp  ? parseFloat(DOM.proofBLp.value)  / 100 : 0;
    const p_b_vol = DOM.proofBVol ? parseFloat(DOM.proofBVol.value) / 100 : 0;

    DOM.rVal.innerText      = r;
    DOM.tVal.innerText      = t;
    DOM.p1Val.innerText     = DOM.net.value;
    DOM.pPecahVal.innerText = DOM.pecah.value;
    DOM.p2Val.innerText     = DOM.transmute.value;

    if (DOM.pLaVal)  DOM.pLaVal.innerText  = DOM.proofLa.value;
    if (DOM.pLsVal)  DOM.pLsVal.innerText  = DOM.proofLs.value;
    if (DOM.pLpVal)  DOM.pLpVal.innerText  = DOM.proofLp.value;
    if (DOM.pVolVal) DOM.pVolVal.innerText = DOM.proofVol.value;

    if (DOM.pkLaVal)  DOM.pkLaVal.innerText  = DOM.proofKLa.value;
    if (DOM.pkLsVal)  DOM.pkLsVal.innerText  = DOM.proofKLs.value;
    if (DOM.pkLpVal)  DOM.pkLpVal.innerText  = DOM.proofKLp.value;
    if (DOM.pkVolVal) DOM.pkVolVal.innerText = DOM.proofKVol.value;

    if (DOM.pbLpVal)  DOM.pbLpVal.innerText  = DOM.proofBLp  ? DOM.proofBLp.value : 0;
    if (DOM.pbVolVal) DOM.pbVolVal.innerText = DOM.proofBVol ? DOM.proofBVol.value : 0;

    DOM.pecahGroup.style.display     = (shape === 'bola') ? 'flex' : 'none';
    DOM.transmuteGroup.style.display = (shape === 'bola') ? 'flex' : 'none';
    DOM.tGroup.style.display         = (shape === 'bola') ? 'none' : 'flex';

    const netActive = parseFloat(DOM.net.value) > 0;
    const isTabung  = (shape === 'tabung');
    const isKerucut = (shape === 'kerucut');
    const isBola    = (shape === 'bola');

    if (DOM.proofTGroup) DOM.proofTGroup.style.display = isTabung ? 'block' : 'none';
    if (DOM.proofKGroup) DOM.proofKGroup.style.display = isKerucut ? 'block' : 'none';
    if (DOM.proofBGroup) DOM.proofBGroup.style.display = isBola ? 'block' : 'none';

    const hintT = document.getElementById('hint-tabung');
    const hintK = document.getElementById('hint-kerucut');
    const hintB = document.getElementById('hint-bola');

    if (hintT) {
        if (!isTrans && isTabung) { hintT.style.display = 'block'; hintT.textContent = 'Aktifkan Mode Kaca terlebih dahulu'; }
        else if (isTrans && netActive && isTabung) { hintT.style.display = 'block'; hintT.textContent = 'Reset Jaring-Jaring ke 0 dulu'; }
        else hintT.style.display = 'none';
    }
    if (hintK) {
        if (!isTrans && isKerucut) { hintK.style.display = 'block'; hintK.textContent = 'Aktifkan Mode Kaca terlebih dahulu'; }
        else if (isTrans && netActive && isKerucut) { hintK.style.display = 'block'; hintK.textContent = 'Reset Jaring-Jaring ke 0 dulu'; }
        else hintK.style.display = 'none';
    }
    if (hintB && isBola) {
        if (!isTrans) { hintB.style.display = 'block'; hintB.textContent = 'Aktifkan Mode Kaca terlebih dahulu'; }
        else hintB.style.display = 'none';
    }

    if (DOM.transmuteHint && isBola) {
        const pecahVal = parseFloat(DOM.pecah.value);
        DOM.transmuteHint.style.display = pecahVal < 20 ? 'block' : 'none';
    }

    const needLock = !isTrans || netActive;
    if (DOM.proofTGroup) {
        DOM.proofTGroup.querySelectorAll('input[type="range"]').forEach(inp => {
            inp.disabled = needLock; inp.style.opacity = needLock ? '0.4' : '1';
            inp.style.cursor = needLock ? 'not-allowed' : 'pointer';
            if (needLock) inp.value = 0;
        });
    }
    if (DOM.proofKGroup) {
        DOM.proofKGroup.querySelectorAll('input[type="range"]').forEach(inp => {
            inp.disabled = needLock; inp.style.opacity = needLock ? '0.4' : '1';
            inp.style.cursor = needLock ? 'not-allowed' : 'pointer';
            if (needLock) inp.value = 0;
        });
    }

    if (isBola) {
        const bolaProofNeedLock = !isTrans;
        if (DOM.proofBLp) {
            const lockLp = bolaProofNeedLock || (p_b_vol > 0);
            DOM.proofBLp.disabled  = lockLp;
            DOM.proofBLp.style.opacity = lockLp ? '0.4' : '1';
            DOM.proofBLp.style.cursor  = lockLp ? 'not-allowed' : 'pointer';
            if (lockLp && !bolaProofNeedLock) DOM.proofBLp.value = 0;
        }
        if (DOM.proofBVol) {
            const lockVol = bolaProofNeedLock || (p_b_lp > 0);
            DOM.proofBVol.disabled  = lockVol;
            DOM.proofBVol.style.opacity = lockVol ? '0.4' : '1';
            DOM.proofBVol.style.cursor  = lockVol ? 'not-allowed' : 'pointer';
            if (lockVol && !bolaProofNeedLock) DOM.proofBVol.value = 0;
        }
    }

    const anyProofActive = isTabung ? (p_la + p_ls + p_lp + p_vol > 0)
        : isKerucut ? (p_la_k + p_ls_k + p_lp_k + p_vol_k > 0)
        : isBola ? (p_b_vol > 0 || p_b_lp > 0) : false;

    if (isTabung || isKerucut) {
        DOM.net.disabled = anyProofActive; DOM.net.style.opacity = anyProofActive ? '0.4' : '1';
        DOM.net.style.cursor = anyProofActive ? 'not-allowed' : 'pointer';
    } else if (isBola) {
        const lockBola = p_b_vol > 0 || p_b_lp > 0;
        DOM.net.disabled = lockBola; DOM.net.style.opacity = lockBola ? '0.4' : '1';
        DOM.net.style.cursor = lockBola ? 'not-allowed' : 'pointer';
        DOM.pecah.disabled = lockBola; DOM.pecah.style.opacity = lockBola ? '0.4' : '1';
        DOM.pecah.style.cursor = lockBola ? 'not-allowed' : 'pointer';
        DOM.transmute.disabled = lockBola || parseFloat(DOM.pecah.value) < 20;
        DOM.transmute.style.opacity = (lockBola || parseFloat(DOM.pecah.value) < 20) ? '0.4' : '1';
        DOM.transmute.style.cursor = (lockBola || parseFloat(DOM.pecah.value) < 20) ? 'not-allowed' : 'pointer';
        if (lockBola) { DOM.net.value = 0; DOM.pecah.value = 0; DOM.transmute.value = 0; }
    } else {
        DOM.net.disabled = false; DOM.net.style.opacity = '1'; DOM.net.style.cursor = 'pointer';
    }

    buildShape(shape, r, t, p_jeruk, p_pecah, p_transmute, p_la, p_ls, p_lp, p_vol, p_la_k, p_ls_k, p_lp_k, p_vol_k, p_b_vol, p_b_lp);
    updateMath(shape, r, t, p_transmute, p_b_vol, p_b_lp);
}

function makeLabel(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = "bold 52px 'Segoe UI', Arial";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = color || "#ffff00";
    ctx.strokeStyle = "#000000"; ctx.lineWidth = 7;
    ctx.strokeText(text, 200, 64); ctx.fillText(text, 200, 64);
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(6.25, 2, 1);
    return sprite;
}

function makeFractionLabel(prefix, top, bot, suffix, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color || "#ffff00"; ctx.strokeStyle = "#000000";
    ctx.lineWidth = 6; ctx.textBaseline = "middle";
    let x = 20;
    if (prefix) {
        ctx.font = "bold 52px 'Segoe UI', Arial";
        ctx.strokeText(prefix, x, 64); ctx.fillText(prefix, x, 64);
        x += ctx.measureText(prefix).width + 5;
    }
    ctx.font = "bold 38px 'Segoe UI', Arial";
    let topW = ctx.measureText(top).width; let botW = ctx.measureText(bot).width;
    let fracW = Math.max(topW, botW);
    ctx.strokeText(top, x + (fracW-topW)/2, 35); ctx.fillText(top, x + (fracW-topW)/2, 35);
    ctx.beginPath(); ctx.moveTo(x - 2, 64); ctx.lineTo(x + fracW + 2, 64); ctx.stroke();
    ctx.strokeStyle = color || "#ffff00"; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.strokeStyle = "#000000"; ctx.lineWidth = 6;
    ctx.strokeText(bot, x + (fracW-botW)/2, 95); ctx.fillText(bot, x + (fracW-botW)/2, 95);
    x += fracW + 15;
    if (suffix) {
        ctx.font = "bold 52px 'Segoe UI', Arial";
        ctx.strokeText(suffix, x, 64); ctx.fillText(suffix, x, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(8, 2, 1);
    return sprite;
}

function createDynamicWireframe(planeGeom, wSeg, hSeg, type) {
    const indices = [];
    if (type === 'perimeter') {
        for (let i = 0; i < wSeg; i++) {
            indices.push(i, i + 1);
            indices.push(hSeg * (wSeg + 1) + i, hSeg * (wSeg + 1) + i + 1);
        }
    }
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', planeGeom.attributes.position);
    lineGeom.setIndex(indices);
    return new THREE.LineSegments(lineGeom, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, linewidth: 2 }));
}

function buildTriangleMesh(type, r, t, yellowFrac, isFullYellow, capOpacity, glowProgress, theme) {
    const N_seg = 120;
    const nYellow = isFullYellow ? N_seg : Math.round(yellowFrac * N_seg);
    const N_frontier = 3;
    const startAngle = -Math.PI / 2;
    const positions = new Float32Array(N_seg * 3 * 3);
    const colorsArr = new Float32Array(N_seg * 3 * 3);

    let cBase, cTarget, cGlow1, cGlow2, cWhite = [1.0, 1.0, 1.0];
    if (theme === 'tabung') {
        cBase   = [0.055, 0.647, 0.914];
        cTarget = [1.0, 0.867, 0.0];
        cGlow2  = [1.0, 0.96, 0.40];
        cGlow1  = [1.0, 1.00, 0.70];
    } else {
        cBase   = [0.133, 0.773, 0.369];
        cTarget = [1.0, 0.867, 0.0];
        cGlow2  = [1.0, 0.96, 0.40];
        cGlow1  = [1.0, 1.00, 0.70];
    }

    for (let i = 0; i < N_seg; i++) {
        const a0 = startAngle + (i / N_seg) * 2 * Math.PI;
        const a1 = startAngle + ((i + 1) / N_seg) * 2 * Math.PI;
        const base = i * 9;

        if (type === 'cap') {
            positions[base+0]=0; positions[base+1]=0; positions[base+2]=0;
            positions[base+3]=r*Math.cos(a0); positions[base+4]=0; positions[base+5]=r*Math.sin(a0);
            positions[base+6]=r*Math.cos(a1); positions[base+7]=0; positions[base+8]=r*Math.sin(a1);
        } else if (type === 'cone_side') {
            positions[base+0]=0; positions[base+1]=t/2; positions[base+2]=0;
            positions[base+3]=r*Math.cos(a0); positions[base+4]=-t/2; positions[base+5]=r*Math.sin(a0);
            positions[base+6]=r*Math.cos(a1); positions[base+7]=-t/2; positions[base+8]=r*Math.sin(a1);
        }

        let col;
        if (i < nYellow) {
            const distFromFrontier = nYellow - 1 - i;
            if (glowProgress > 0 && distFromFrontier < N_frontier) {
                if (distFromFrontier === 0) col = lerpColor(cTarget, cWhite, glowProgress);
                else if (distFromFrontier === 1) col = lerpColor(cTarget, cGlow1, glowProgress);
                else col = lerpColor(cTarget, cGlow2, glowProgress);
            } else { col = cTarget; }
        } else { col = cBase; }

        for (let v = 0; v < 3; v++) {
            colorsArr[base+v*3+0]=col[0]; colorsArr[base+v*3+1]=col[1]; colorsArr[base+v*3+2]=col[2];
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color',    new THREE.BufferAttribute(colorsArr, 3));
    geom.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: isTrans, opacity: capOpacity });
    return new THREE.Mesh(geom, mat);
}

function drawHollowCylinder(group, cx, cy, cz, r, h, color, opacity) {
    const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64, 1, true), mat);
    cyl.position.set(cx, cy, cz); group.add(cyl);
    const circMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: opacity * 1.5 });
    [cy + h/2, cy - h/2].forEach(y => {
        const pts = Array.from({length:65},(_,i)=>new THREE.Vector3(cx+r*Math.cos(i/64*Math.PI*2), y, cz+r*Math.sin(i/64*Math.PI*2)));
        const circ = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), circMat);
        group.add(circ);
    });
}

function makeWaterMats(color) {
    return {
        back:  new THREE.MeshStandardMaterial({ color, transparent: false, opacity: 1.0, side: THREE.BackSide,  depthWrite: true, roughness: 0.05 }),
        front: new THREE.MeshStandardMaterial({ color, transparent: false, opacity: 1.0, side: THREE.DoubleSide, depthWrite: true, roughness: 0.05 }),
        surf:  new THREE.MeshStandardMaterial({ color, transparent: false, opacity: 1.0, side: THREE.DoubleSide, depthWrite: true, roughness: 0.04 }),
        solid: new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.08, transparent: false, opacity: 1.0, side: THREE.DoubleSide, depthWrite: false, depthTest: false, roughness: 0.04 }),
    };
}

function fillCylinder(group, cx, cy_bot, cz, r, h_water, h_total, mats) {
    if (h_water <= 0.001) return;
    const isFull = h_water >= h_total * 0.999;
    if (isFull) {
        const full = new THREE.Mesh(new THREE.CylinderGeometry(r*0.997, r*0.997, h_total, 64, 1, false), mats.solid);
        full.position.set(cx, cy_bot + h_total/2, cz); group.add(full); return;
    }
    const yCenter = cy_bot + h_water/2; const yTop = cy_bot + h_water;
    const wBack  = new THREE.Mesh(new THREE.CylinderGeometry(r*0.997, r*0.997, h_water, 64, 1, true), mats.back);  wBack.position.set(cx, yCenter, cz);
    const wFront = new THREE.Mesh(new THREE.CylinderGeometry(r*0.997, r*0.997, h_water, 64, 1, true), mats.front); wFront.position.set(cx, yCenter, cz);
    const surf   = new THREE.Mesh(new THREE.CircleGeometry(r*0.997, 64), mats.surf); surf.rotation.x = -Math.PI/2; surf.position.set(cx, yTop, cz);
    const base   = new THREE.Mesh(new THREE.CircleGeometry(r*0.997, 64), mats.surf); base.rotation.x = -Math.PI/2; base.position.set(cx, cy_bot, cz);
    group.add(wBack, wFront, surf, base);
}

function fillBowl(group, cx, cy_bot, cz, r, frac, mats) {
    if (frac <= 0.001) return;
    const H = frac * r; const isFull = frac >= 0.999;
    if (isFull) {
        const geom = new THREE.SphereGeometry(r*0.997, 64, 32, 0, Math.PI*2, Math.PI/2, Math.PI/2);
        const mesh = new THREE.Mesh(geom, mats.solid); mesh.position.set(cx, cy_bot + r, cz); group.add(mesh);
        const base = new THREE.Mesh(new THREE.CircleGeometry(r*0.997, 64), mats.surf);
        base.rotation.x = -Math.PI/2; base.position.set(cx, cy_bot + r, cz); group.add(base); return;
    }
    const thetaSurface = Math.acos(-1 + H/r); const thetaLength = Math.PI - thetaSurface;
    const wBack = new THREE.Mesh(new THREE.SphereGeometry(r*0.997, 64, 32, 0, Math.PI*2, thetaSurface, thetaLength), mats.back);
    wBack.position.set(cx, cy_bot + r, cz);
    const wFront = new THREE.Mesh(new THREE.SphereGeometry(r*0.997, 64, 32, 0, Math.PI*2, thetaSurface, thetaLength), mats.front);
    wFront.position.set(cx, cy_bot + r, cz);
    const rSurf = r * Math.sin(thetaSurface);
    const surf = new THREE.Mesh(new THREE.CircleGeometry(rSurf*0.997, 64), mats.surf);
    surf.rotation.x = -Math.PI/2; surf.position.set(cx, cy_bot + H, cz);
    group.add(wBack, wFront, surf);
}

function fillCone(group, cx, cy_bot, cz, r, h, frac, mats) {
    if (frac <= 0.001) return;
    const H = frac * h; const isFull = frac >= 0.999;
    if (isFull) {
        const geom = new THREE.ConeGeometry(r*0.997, h, 64);
        const mesh = new THREE.Mesh(geom, mats.solid); mesh.position.set(cx, cy_bot + h/2, cz); group.add(mesh);
        const base = new THREE.Mesh(new THREE.CircleGeometry(r*0.997, 64), mats.surf);
        base.rotation.x = -Math.PI/2; base.position.set(cx, cy_bot, cz); group.add(base); return;
    }
    const rTop = r * (h - H) / h; const rBot = r;
    const wBack = new THREE.Mesh(new THREE.CylinderGeometry(rTop*0.997, rBot*0.997, H, 64, 1, true), mats.back);
    wBack.position.set(cx, cy_bot + H/2, cz);
    const wFront = new THREE.Mesh(new THREE.CylinderGeometry(rTop*0.997, rBot*0.997, H, 64, 1, true), mats.front);
    wFront.position.set(cx, cy_bot + H/2, cz);
    const surf = new THREE.Mesh(new THREE.CircleGeometry(rTop*0.997, 64), mats.surf);
    surf.rotation.x = -Math.PI/2; surf.position.set(cx, cy_bot + H, cz);
    const base = new THREE.Mesh(new THREE.CircleGeometry(rBot*0.997, 64), mats.surf);
    base.rotation.x = -Math.PI/2; base.position.set(cx, cy_bot, cz);
    group.add(wBack, wFront, surf, base);
}

function buildShape(shape, r, t, p_jeruk, p_pecah, p_transmute, p_la=0, p_ls=0, p_lp=0, p_vol=0, p_la_k=0, p_ls_k=0, p_lp_k=0, p_vol_k=0, p_b_vol=0, p_b_lp=0) {
    if (shape === 'tabung' || shape === 'kerucut') {
        const isTabung  = (shape === 'tabung');
        const isKerucut = (shape === 'kerucut');
        const capOpacity = isTrans ? 0.55 : 1.0;

        const anyKerucutSideProof = isKerucut && (p_la_k + p_ls_k + p_lp_k > 0) && (p_jeruk === 0);
        if (anyKerucutSideProof) {
            let ph2 = p_lp_k > 0 ? Math.max(0, Math.min(1, (p_lp_k - 0.5) / 0.5)) : 0;
            let sideBlueFrac = Math.max(p_ls_k, ph2);
            const sideMesh = buildTriangleMesh('cone_side', r, t, sideBlueFrac, sideBlueFrac >= 1.0, capOpacity, getGlowProgress(), 'kerucut');
            mainGroup.add(sideMesh);
            if (isTrans) {
                const baseEdgeGeom = new THREE.BufferGeometry().setFromPoints(Array.from({length:65},(_,i)=>new THREE.Vector3(r*Math.cos(i/64*Math.PI*2),-t/2,r*Math.sin(i/64*Math.PI*2))));
                mainGroup.add(new THREE.Line(baseEdgeGeom, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })));
            }
        } else {
            const wSeg = 64, hSeg = 32;
            const selimutGeom = new THREE.PlaneGeometry(1, 1, wSeg, hSeg);
            const pos = selimutGeom.attributes.position;
            const s_garis = isTabung ? 0 : Math.sqrt(r*r + t*t);
            const alpha   = isTabung ? 0 : (2*Math.PI*r) / s_garis;
            const ph2_lp  = isTabung ? Math.max(0, Math.min(1, (p_lp - 0.33) / 0.33)) : 0;
            const selimutYellowFrac = isTabung ? Math.max(p_ls, ph2_lp) : 0;
            const volFrac = isTabung ? p_vol : 0;
            const colorBase   = new THREE.Color(isTabung ? 0x0ea5e9 : 0x22c55e);
            const colorYellow = new THREE.Color(0xffdd00);
            const colorVol    = new THREE.Color(COLOR_VOL_ANIM);
            const colors = new Float32Array(pos.count * 3);
            for (let i = 0; i < pos.count; i++) {
                const v_norm = pos.getY(i) + 0.5;
                let c = colorBase.clone();
                if (isTabung && volFrac > 0 && v_norm <= volFrac) c.copy(colorVol);
                if (isTabung && selimutYellowFrac > 0 && v_norm <= selimutYellowFrac) c.copy(colorYellow);
                colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b;
            }
            selimutGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            for (let i = 0; i < pos.count; i++) {
                let u = pos.getX(i) + 0.5; let v = pos.getY(i) + 0.5;
                let theta = u * Math.PI * 2 - Math.PI;
                let r_curr = isTabung ? r : (r * v);
                let x0 = r_curr * Math.sin(theta); let y0 = (v - 0.5) * (isTabung ? t : -t); let z0 = r_curr * Math.cos(theta);
                let x1, y1, z1;
                if (isTabung) { x1 = theta*r; y1=(v-0.5)*t; z1=r; }
                else { let phi=(u-0.5)*alpha; let d=v*s_garis; x1=d*Math.sin(phi); y1=(-t/2+s_garis)-d*Math.cos(phi); z1=r; }
                pos.setXYZ(i, lerp(x0,x1,p_jeruk), lerp(y0,y1,p_jeruk), lerp(z0,z1,p_jeruk));
            }
            selimutGeom.computeVertexNormals();
            const anyProof = isTabung && (p_ls > 0 || p_lp > 0 || p_vol > 0);
            const selimutMat = anyProof
                ? new THREE.MeshStandardMaterial({ vertexColors:true, side:THREE.DoubleSide, roughness:0.1, transparent:isTrans, opacity:capOpacity })
                : materials[shape];
            const sGroup = new THREE.Group();
            sGroup.add(new THREE.Mesh(selimutGeom, selimutMat));
            if (isTrans) sGroup.add(createDynamicWireframe(selimutGeom, wSeg, hSeg, 'perimeter'));
            mainGroup.add(sGroup);
        }

        [{y: t/2, rot: -Math.PI/2, rotAnim: 1, isTop: true},
         {y: -t/2, rot: Math.PI/2, rotAnim: -1, isTop: false}].forEach((cap, idx) => {
            if (isKerucut && idx === 0) return;
            if (isTabung && p_vol > 0) return;
            let mesh;
            let cGroup = new THREE.Group();
            if (isTabung) {
                const ph1 = p_lp > 0 ? Math.min(1, p_lp / 0.33) : 0;
                const ph3 = p_lp > 0 ? Math.max(0, Math.min(1, (p_lp - 0.66) / 0.34)) : 0;
                if (p_la > 0 && p_lp === 0) { mesh = buildTriangleMesh('cap', r, t, p_la, false, capOpacity, getGlowProgress(), 'tabung'); }
                else if (!cap.isTop && ph1 > 0) { mesh = buildTriangleMesh('cap', r, t, Math.min(ph1,1), ph1>=1.0, capOpacity, getGlowProgress(), 'tabung'); }
                else if (cap.isTop && ph3 > 0) { mesh = buildTriangleMesh('cap', r, t, ph3, false, capOpacity, getGlowProgress(), 'tabung'); }
                else { mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 64), materials[shape]); }
            } else if (isKerucut) {
                const ph1 = p_lp_k > 0 ? Math.min(1, p_lp_k / 0.5) : 0;
                if (p_la_k > 0 && p_lp_k === 0) { mesh = buildTriangleMesh('cap', r, t, p_la_k, false, capOpacity, getGlowProgress(), 'kerucut'); }
                else if (ph1 > 0) { mesh = buildTriangleMesh('cap', r, t, ph1, ph1>=1.0, capOpacity, getGlowProgress(), 'kerucut'); }
                else { mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 64), materials[shape]); }
            }
            const isCustomMesh = (isTabung && ((p_la>0&&p_lp===0)||(!cap.isTop&&p_lp>0)||(cap.isTop&&p_lp>0.66))) ||
                                 (isKerucut && ((p_la_k>0&&p_lp_k===0)||(p_lp_k>0)));
            if (isCustomMesh) {
                mesh.position.set(0, cap.y, 0);
                if (isTrans) {
                    const edgeGeom = new THREE.BufferGeometry().setFromPoints(Array.from({length:65},(_,i)=>new THREE.Vector3(r*Math.cos(i/64*Math.PI*2),cap.y,r*Math.sin(i/64*Math.PI*2))));
                    mainGroup.add(new THREE.Line(edgeGeom, new THREE.LineBasicMaterial({ color: 0xffffff })));
                }
                cGroup.rotation.x = p_jeruk * (Math.PI/2) * cap.rotAnim;
                cGroup.add(mesh);
            } else {
                cGroup.position.set(0, cap.y, r);
                mesh.rotation.x = cap.rot; mesh.position.set(0, 0, -r);
                if (isTrans) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(r, 64)), new THREE.LineBasicMaterial({ color: 0xffffff })));
                cGroup.rotation.x = p_jeruk * (Math.PI/2) * cap.rotAnim;
                cGroup.add(mesh);
            }
            mainGroup.add(cGroup);
        });

        if (isTabung && p_vol > 0 && p_jeruk < 0.01) {
            const volHeight = Math.max(0.001, p_vol * t);
            const yBot = -t/2; const yCenter = -t/2 + volHeight/2; const yTop = -t/2 + volHeight;
            const isFull = p_vol >= 0.999;
            const volMat = new THREE.MeshStandardMaterial({ color: COLOR_VOL_ANIM, side: THREE.DoubleSide, roughness: 0.05, transparent: isTrans, opacity: isTrans ? 0.55 : 1.0 });
            const capBot = new THREE.Mesh(new THREE.CircleGeometry(r, 64), volMat); capBot.rotation.x = -Math.PI/2; capBot.position.set(0, yBot, 0); mainGroup.add(capBot);
            if (isFull) { const capTop = new THREE.Mesh(new THREE.CircleGeometry(r, 64), volMat); capTop.rotation.x = -Math.PI/2; capTop.position.set(0, t/2, 0); mainGroup.add(capTop); }
            if (isFull) {
                const fullMesh = new THREE.Mesh(new THREE.CylinderGeometry(r*0.997, r*0.997, t, 64, 1, false), new THREE.MeshStandardMaterial({ color: COLOR_VOL_ANIM, transparent: false, opacity: 1.0, roughness: 0.05 }));
                fullMesh.position.set(0,0,0); mainGroup.add(fullMesh);
            } else {
                const volMatBack  = new THREE.MeshStandardMaterial({ color:COLOR_VOL_ANIM, transparent:true, opacity:0.92, side:THREE.BackSide,  depthWrite:false });
                const volMatFront = new THREE.MeshStandardMaterial({ color:COLOR_VOL_ANIM, transparent:true, opacity:0.80, side:THREE.FrontSide, depthWrite:false });
                const surfMat     = new THREE.MeshStandardMaterial({ color:COLOR_VOL_ANIM, transparent:true, opacity:0.97, side:THREE.DoubleSide, depthWrite:false });
                const wBack  = new THREE.Mesh(new THREE.CylinderGeometry(r*0.997,r*0.997,volHeight,64,1,true), volMatBack);  wBack.position.set(0,yCenter,0); mainGroup.add(wBack);
                const wFront = new THREE.Mesh(new THREE.CylinderGeometry(r*0.997,r*0.997,volHeight,64,1,true), volMatFront); wFront.position.set(0,yCenter,0); mainGroup.add(wFront);
                const surf   = new THREE.Mesh(new THREE.CircleGeometry(r*0.997,64), surfMat); surf.rotation.x=-Math.PI/2; surf.position.set(0,yTop,0); mainGroup.add(surf);
            }
            if (p_vol > 0.85) { const lbl = makeLabel("πr²t"); lbl.position.set(r+1.5, 0, 0); lbl.material.opacity = Math.min(1,(p_vol-0.85)*6.7); mainGroup.add(lbl); }
        }

        if (isKerucut && p_vol_k > 0 && p_jeruk < 0.01) {
            const cyl_x = -(r * 2.5);
            const emptyCylMat = new THREE.MeshStandardMaterial({ color:0xffffff, transparent:true, opacity:0.15, side:THREE.DoubleSide });
            const emptyCyl = new THREE.Mesh(new THREE.CylinderGeometry(r,r,t,64,1,true), emptyCylMat);
            emptyCyl.position.set(cyl_x, 0, 0); mainGroup.add(emptyCyl);
            const circGeom = new THREE.BufferGeometry().setFromPoints(Array.from({length:65},(_,i)=>new THREE.Vector3(r*Math.cos(i/64*Math.PI*2),0,r*Math.sin(i/64*Math.PI*2))));
            const topCircle = new THREE.Line(circGeom, new THREE.LineBasicMaterial({ color:0xffffff, opacity:0.2, transparent:true })); topCircle.position.set(cyl_x,t/2,0);
            const botCircle = new THREE.Line(circGeom, new THREE.LineBasicMaterial({ color:0xffffff, opacity:0.2, transparent:true })); botCircle.position.set(cyl_x,-t/2,0);
            mainGroup.add(topCircle, botCircle);
            let cyl_frac=0, cone_frac=0;
            if (p_vol_k<=100) { cyl_frac=0; cone_frac=p_vol_k/100; }
            else if (p_vol_k<=200) { cyl_frac=1/3; cone_frac=(p_vol_k-100)/100; }
            else if (p_vol_k<300) { cyl_frac=2/3; cone_frac=(p_vol_k-200)/100; }
            else { cyl_frac=1.0; cone_frac=0; }
            const wMats = makeWaterMats(COLOR_VOL_ANIM);
            if (cyl_frac > 0) { fillCylinder(mainGroup, cyl_x, -t/2, 0, r, cyl_frac * t, t, wMats); }
            if (cone_frac > 0) { fillCone(mainGroup, 0, -t/2, 0, r, t, cone_frac, wMats); }
            if (p_vol_k > 80) {
                let lblCyl  = makeLabel("V = πr²t");     lblCyl.position.set(cyl_x-r-1.0, 0, 0); mainGroup.add(lblCyl);
                let lblCone = makeFractionLabel("V = ", "1", "3", " πr²t", "#ffffff");
                lblCone.position.set(r+1.2, 0, 0); mainGroup.add(lblCone);
            }
        }

        if (p_jeruk < 0.01) {
            if (isTabung) {
                if (p_la > 0.5)  { const l = makeLabel("2πr²");     l.position.set(0, t/2+1.2, 0); l.material.opacity = Math.min(1,(p_la-0.5)*2);  mainGroup.add(l); }
                if (p_ls > 0.5)  { const l = makeLabel("2πrt");     l.position.set(r+1.5, 0, 0);   l.material.opacity = Math.min(1,(p_ls-0.5)*2);  mainGroup.add(l); }
                if (p_lp > 0.95) { const l = makeLabel("2πr(r+t)"); l.position.set(r+2, t/4, 0);   l.material.opacity = Math.min(1,(p_lp-0.95)*20); mainGroup.add(l); }
            } else if (isKerucut) {
                if (p_la_k > 0.5)  { const l = makeLabel("πr²");     l.position.set(0, -t/2-1.2, 0); l.material.opacity = Math.min(1,(p_la_k-0.5)*2);  mainGroup.add(l); }
                if (p_ls_k > 0.5)  { const l = makeLabel("πrs");     l.position.set(r+1.5, 0, 0);    l.material.opacity = Math.min(1,(p_ls_k-0.5)*2);  mainGroup.add(l); }
                if (p_lp_k > 0.95) { const l = makeLabel("πr(r+s)"); l.position.set(r+2, t/4, 0);    l.material.opacity = Math.min(1,(p_lp_k-0.95)*20); mainGroup.add(l); }
            }
        }

        const showHL = (p_la+p_ls+p_lp+p_vol+p_la_k+p_ls_k+p_lp_k+p_vol_k) < 0.01;
        if (showHL) addHighlights(r, t, p_jeruk, p_transmute, shape);

    } else if (shape === 'bola') {
        if (p_b_vol > 0 && isTrans) { buildArchimedesProof(r, p_b_vol); return; }

        if (p_b_lp > 0 && isTrans) {
            const goldMat = new THREE.MeshStandardMaterial({ color: COLOR_LUAS_ANIM, side: THREE.DoubleSide, roughness: 0.1 });
            const goldSkin = new THREE.Mesh(new THREE.SphereGeometry(r * 1.01, 64, 32, 0, Math.PI * 2, 0, p_b_lp * Math.PI), goldMat);
            mainGroup.add(goldSkin);
        }

        const N = 12;
        const bGroup = new THREE.Group();
        for (let slice = 0; slice < N; slice++) {
            const wSeg = 6, hSeg = 18;
            let sliceGeom = new THREE.PlaneGeometry(1, 1, wSeg, hSeg).toNonIndexed();
            const pos = sliceGeom.attributes.position;
            let c  = Math.floor(slice / 3);
            let cx = (c===0||c===1) ?  1.15*r : -1.15*r;
            let cz = (c===0||c===2) ?  1.15*r : -1.15*r;
            let cy = -r - 0.2;

            for (let i = 0; i < pos.count; i += 3) {
                let cx0=0, cy0=0, cz0=0;
                let vData = [];
                for (let j = 0; j < 3; j++) {
                    let u_local  = pos.getX(i+j) + 0.5;
                    let v        = pos.getY(i+j) + 0.5;
                    let u_global = (slice + u_local) / N;
                    let theta    = u_global * Math.PI * 2 - Math.PI;
                    let phi      = v * Math.PI;
                    let x0 = r*Math.sin(phi)*Math.sin(theta); let y0 = r*Math.cos(phi); let z0 = r*Math.sin(phi)*Math.cos(theta);
                    cx0+=x0/3; cy0+=y0/3; cz0+=z0/3;
                    let theta_c = (slice+0.5)*(Math.PI*2/N) - Math.PI;
                    let dTheta = theta - theta_c;
                    let xJeruk = theta_c*r + dTheta*r*Math.sin(phi); let yJeruk = (Math.PI/2 - phi)*r; let zJeruk = r;
                    let slice_in_circle = slice % 3;
                    let u_circle = (slice_in_circle + u_local) / 3.0;
                    let alpha    = u_circle * Math.PI * 2 - Math.PI/2;
                    let rho      = r * Math.sin(phi/2.0);
                    let xCircle  = cx + rho*Math.cos(alpha); let yCircle = cy; let zCircle = cz + rho*Math.sin(alpha);
                    vData.push({x0,y0,z0,xJeruk,yJeruk,zJeruk,xCircle,yCircle,zCircle});
                }
                let hIndex = slice*1000 + i;
                let randDist = r*0.5 + hash(hIndex)*r*2.0; let randY = (hash(hIndex+1)-0.5)*r*2;
                let len = Math.sqrt(cx0*cx0+cy0*cy0+cz0*cz0) || 1;
                let nx=cx0/len, ny=cy0/len, nz=cz0/len;
                for (let j=0; j<3; j++) {
                    let vd = vData[j];
                    let bx=lerp(vd.x0,vd.xJeruk,p_jeruk), by=lerp(vd.y0,vd.yJeruk,p_jeruk), bz=lerp(vd.z0,vd.zJeruk,p_jeruk);
                    let ex=bx+nx*randDist, ey=by+ny*randDist+randY, ez=bz+nz*randDist;
                    let sx=lerp(bx,ex,p_pecah), sy=lerp(by,ey,p_pecah), sz=lerp(bz,ez,p_pecah);
                    let finalX=lerp(sx,vd.xCircle,p_transmute), finalY=lerp(sy,vd.yCircle,p_transmute), finalZ=lerp(sz,vd.zCircle,p_transmute);
                    pos.setXYZ(i+j, finalX, finalY, finalZ);
                }
            }
            sliceGeom.computeVertexNormals();
            bGroup.add(new THREE.Mesh(sliceGeom, materials.bola));
            if (isTrans) {
                const edges = new THREE.EdgesGeometry(sliceGeom, 30);
                bGroup.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0.3 })));
            }
        }
        mainGroup.add(bGroup);

        if (p_transmute > 0) {
            const targetMat = new THREE.LineBasicMaterial({ color:0xffff00, transparent:true, opacity:p_transmute });
            for (let c=0; c<4; c++) {
                let cx=(c===0||c===1)?1.15*r:-1.15*r; let cz=(c===0||c===2)?1.15*r:-1.15*r; let cy=-r-0.25;
                const targetMesh = new THREE.LineLoop(new THREE.EdgesGeometry(new THREE.CircleGeometry(r,64)), targetMat);
                targetMesh.rotation.x=-Math.PI/2; targetMesh.position.set(cx,cy,cz); mainGroup.add(targetMesh);
                if (p_transmute > 0.1) { let lbl=makeLabel("πr²"); lbl.position.set(cx,cy+0.2,cz); lbl.material.opacity=p_transmute; mainGroup.add(lbl); }
            }
        }
        addHighlights(r, r, Math.max(p_jeruk,p_pecah), p_transmute, shape, p_b_lp);
    }
}

function buildArchimedesProof(r, p) {
    const h = r;
    const spacing = r * 3.2;
    const x_tab = -spacing; const x_bola = 0; const x_ker = spacing;
    const y_base = -h / 2;
    const wMats = makeWaterMats(COLOR_VOL_ANIM);

    let fill_fill = 0, cone_drain = 0, tab_from_cone = 0, hs_drain = 0, tab_from_hs = 0;
    if (p <= 0.30) { fill_fill = p / 0.30; }
    else if (p <= 0.60) { fill_fill = 1.0; cone_drain = (p - 0.30) / 0.30; tab_from_cone = cone_drain * (1/3); }
    else { fill_fill = 1.0; cone_drain = 1.0; tab_from_cone = 1/3; hs_drain = (p - 0.60) / 0.40; tab_from_hs = hs_drain * (2/3); }

    const tab_fill_total = tab_from_cone + tab_from_hs;
    drawHollowCylinder(mainGroup, x_tab, 0, 0, r, h, 0xffffff, 0.15);

    {
        const mat = new THREE.MeshStandardMaterial({ color:0xef4444, transparent:true, opacity:0.15, side:THREE.DoubleSide, depthWrite:false });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32, 0, Math.PI*2, Math.PI/2, Math.PI/2), mat);
        mesh.position.set(x_bola, y_base + r, 0); mainGroup.add(mesh);
        const pts = Array.from({length:65},(_,i)=>new THREE.Vector3(x_bola+r*Math.cos(i/64*Math.PI*2), y_base + r, r*Math.sin(i/64*Math.PI*2)));
        mainGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0.25 })));
    }
    {
        const mat = new THREE.MeshStandardMaterial({ color:0x22c55e, transparent:true, opacity:0.15, side:THREE.DoubleSide, depthWrite:false });
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 64, 1, true), mat);
        cone.position.set(x_ker, y_base + h/2, 0); mainGroup.add(cone);
        const pts = Array.from({length:65},(_,i)=>new THREE.Vector3(x_ker+r*Math.cos(i/64*Math.PI*2), y_base, r*Math.sin(i/64*Math.PI*2)));
        mainGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0.25 })));
    }

    if (fill_fill >= 1.0 && cone_drain > 0) { fillCone(mainGroup, x_ker, y_base, 0, r, h, 1.0 - cone_drain, wMats); }
    else if (fill_fill > 0) { fillCone(mainGroup, x_ker, y_base, 0, r, h, fill_fill, wMats); }

    if (fill_fill >= 1.0 && hs_drain > 0) { fillBowl(mainGroup, x_bola, y_base, 0, r, 1.0 - hs_drain, wMats); }
    else if (fill_fill > 0) { fillBowl(mainGroup, x_bola, y_base, 0, r, fill_fill, wMats); }

    if (tab_fill_total > 0.001) { fillCylinder(mainGroup, x_tab, y_base, 0, r, tab_fill_total * h, h, wMats); }

    const labelOpacity = Math.min(1, p * 3);
    if (p > 0.05) {
        const lTab = makeLabel("Tabung", "#ffffff"); lTab.position.set(x_tab, h/2 + 1.5, 0); lTab.material.opacity = labelOpacity; lTab.scale.set(4, 1.3, 1); mainGroup.add(lTab);
        const lBola = makeFractionLabel("", "1", "2", " Bola", "#ffaaaa");
        lBola.position.set(x_bola, r + 1.5, 0); lBola.material.opacity = labelOpacity; lBola.scale.set(7, 1.6, 1); mainGroup.add(lBola);
        const lKer = makeLabel("Kerucut", "#aaffaa"); lKer.position.set(x_ker, h/2 + 1.5, 0); lKer.material.opacity = labelOpacity; lKer.scale.set(4, 1.3, 1); mainGroup.add(lKer);
    }
    if (p > 0.1) {
        const rNote = makeLabel("r = t = " + document.getElementById('r-val').innerText + " cm", "#ffff00");
        rNote.position.set(0, -r - 2.0, 0); rNote.material.opacity = labelOpacity; rNote.scale.set(7, 1.5, 1); mainGroup.add(rNote);
    }
    if (p > 0.85) {
        const finalOp = Math.min(1, (p-0.85)*6.7);
        const lFormula = makeFractionLabel("V = ", "4", "3", " πr³", "#ffd700");
        lFormula.position.set(0, r + 3.5, 0); lFormula.material.opacity = finalOp; lFormula.scale.set(8, 1.8, 1); mainGroup.add(lFormula);
    }
}

function addHighlights(r, t, p_main, p_transmute, shape, p_b_lp=0) {
    if (!isTrans || Math.max(p_main, p_transmute) > 0.1) return;
    const hlGroup = new THREE.Group();
    if (shape === 'bola') {
        const pivot = new THREE.Group();
        const rLine = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, r), matHighlight);
        if (p_b_lp > 0) {
            rLine.position.set(0, r/2, 0);
            pivot.add(rLine);
            pivot.rotation.y = p_b_lp * Math.PI * 30;
            pivot.rotation.z = p_b_lp * Math.PI;
            let lblR = makeLabel("r"); lblR.position.set(0, r/2 + 0.6, 0); pivot.add(lblR);
        } else {
            rLine.rotation.z = Math.PI/2; rLine.position.set(r/2, 0, 0); pivot.add(rLine);
            let lblR = makeLabel("r"); lblR.position.set(r/2, 0.6, 0); pivot.add(lblR);
        }
        hlGroup.add(pivot);
    } else if (shape === 'tabung' || shape === 'kerucut') {
        const rLine = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, r), matHighlight); rLine.rotation.z = Math.PI/2; rLine.position.set(r/2, -t/2+0.05, 0); hlGroup.add(rLine);
        let lblR = makeLabel("r"); lblR.position.set(r/2, -t/2+0.6, 0); hlGroup.add(lblR);
        const tLine = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, t), matHighlight); tLine.position.set(0, 0, 0); hlGroup.add(tLine);
        let lblT = makeLabel("t"); lblT.position.set(0.6, 0, 0); hlGroup.add(lblT);
        if (shape === 'kerucut') {
            const s = Math.sqrt(r*r+t*t);
            const sLine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, s), matHighlight); sLine.position.set(r/2, 0, 0); sLine.rotation.z = Math.atan2(r,t); hlGroup.add(sLine);
            let lblS = makeLabel("s"); lblS.position.set(r/2+0.8, 0.6, 0); hlGroup.add(lblS);
        }
    }
    mainGroup.add(hlGroup);
}

function updateMath(shape, r, t, p_transmute, p_b_vol=0, p_b_lp=0) {
    const PI = Math.PI;
    let la=0, ls=0, lp=0, v=0;
    if (shape === 'tabung') {
        document.getElementById('row-alas').style.display    = 'block';
        document.getElementById('row-selimut').style.display = 'block';
        document.querySelector('#row-alas .math-title').innerText = "Luas Alas & Tutup";
        la = 2*PI*r*r; ls = 2*PI*r*t; lp = 2*PI*r*(r+t); v = PI*r*r*t;
        DOM.fLa.innerHTML="2πr²"; DOM.fLs.innerHTML="2πrt"; DOM.fLp.innerHTML="2πr(r + t)"; DOM.fV.innerHTML="πr²t";
    } else if (shape === 'kerucut') {
        document.getElementById('row-alas').style.display    = 'block';
        document.getElementById('row-selimut').style.display = 'block';
        document.querySelector('#row-alas .math-title').innerText = "Luas Alas";
        const s = Math.sqrt(r*r+t*t);
        la=PI*r*r; ls=PI*r*s; lp=PI*r*(r+s); v=(1/3)*PI*r*r*t;
        DOM.fLa.innerHTML="πr²"; DOM.fLs.innerHTML="πrs"; DOM.fLp.innerHTML="πr(r + s)";
        DOM.fV.innerHTML="<span class='frac'><span class='top'>1</span><span class='bot'>3</span></span>πr²t";
    } else if (shape === 'bola') {
        document.getElementById('row-alas').style.display    = 'none';
        document.getElementById('row-selimut').style.display = 'none';
        lp = 4*PI*r*r; v = (4/3)*PI*Math.pow(r, 3);
        if (p_b_vol > 0) {
            DOM.fLp.innerHTML = "4πr²";
            DOM.fV.innerHTML = `<span class='math-proof-active' style='display:block; text-align:center;'>
            V Tabung = V <span class='frac'><span class='top'>1</span><span class='bot'>2</span></span> Bola + V Kerucut<br>
            <span style='font-size:0.85em; font-weight:normal; opacity:0.8;'>(r dan t tabung/kerucut = r bola)</span><br><br>
            <span class='frac'><span class='top'>1</span><span class='bot'>2</span></span> V Bola = V Tabung − V Kerucut<br>
            <span class='frac'><span class='top'>1</span><span class='bot'>2</span></span> V Bola = πr³ − <span class='frac'><span class='top'>1</span><span class='bot'>3</span></span>πr³<br>
            <span class='frac'><span class='top'>1</span><span class='bot'>2</span></span> V Bola = <span class='frac'><span class='top'>2</span><span class='bot'>3</span></span>πr³<br><br>
            <span style='font-size:1.15em; color:#8a6d00;'>∴ V Bola = <b><span class='frac'><span class='top'>4</span><span class='bot'>3</span></span>πr³</b></span>
            </span>`;
        } else if (p_b_lp > 0) {
            DOM.fLp.innerHTML = "<span class='math-proof-active'>L = 4πr²</span>";
            DOM.fV.innerHTML = "<span class='frac'><span class='top'>4</span><span class='bot'>3</span></span>πr³";
        } else {
            DOM.fLp.innerHTML = (p_transmute > 0.85)
                ? "<span class='math-proof-active'>πr² + πr² + πr² + πr² = 4πr²</span>"
                : "4πr²";
            DOM.fV.innerHTML = "<span class='frac'><span class='top'>4</span><span class='bot'>3</span></span>πr³";
        }
    }
    document.getElementById('la-result').innerText  = la.toFixed(2);
    document.getElementById('ls-result').innerText  = ls.toFixed(2);
    document.getElementById('lp-result').innerText  = lp.toFixed(2);
    document.getElementById('vol-result').innerText = v.toFixed(2);
}

function applyTransToggle() {
    isTrans = !isTrans;
    const btnD = document.getElementById('btn-trans-desktop');
    if (btnD) { btnD.innerText = isTrans ? "Mode: Kaca Transparan (Klik untuk Solid)" : "Mode: Solid (Klik untuk Kaca Transparan)"; }
    const btnM = document.getElementById('btn-trans');
    if (btnM) btnM.textContent = isTrans ? '🔲' : '👁';
    Object.values(materials).forEach(mat => { mat.transparent=isTrans; mat.opacity=isTrans?0.4:1.0; mat.depthWrite=!isTrans; });
    if (!isTrans) {
        ['proof-la-slider','proof-ls-slider','proof-lp-slider','proof-vol-slider',
         'proof-k-la-slider','proof-k-ls-slider','proof-k-lp-slider','proof-k-vol-slider',
         'proof-b-lp-slider', 'proof-b-vol-slider',
         'luas-datar-slider', 'volume-datar-slider'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = 0;
        });
        diagBidangOn = false; diagRuangOn = false; diagBDiagonalOn = false;
        updateDiagonalButtonUI();
    }
    updateScene();
}

const _btnD = document.getElementById('btn-trans-desktop');
const _btnM = document.getElementById('btn-trans');
if (_btnD) _btnD.addEventListener('click', applyTransToggle);
if (_btnM) _btnM.addEventListener('click', applyTransToggle);

let _syncingShape = false;
function onShapeChange(sourceEl) {
    if (_syncingShape) return;
    _syncingShape = true;
    const val = sourceEl.value;
    if (_shapeDesktop && _shapeDesktop !== sourceEl) _shapeDesktop.value = val;
    if (_shapeMobile  && _shapeMobile  !== sourceEl) _shapeMobile.value  = val;
    const isBola = val === 'bola';
    if (DOM.lblNet) DOM.lblNet.innerText = isBola ? "Mode Jaring (Jeruk):" : "Mode Jaring-Jaring:";
    DOM.net.value = 0; DOM.pecah.value = 0; DOM.transmute.value = 0;
    ['proof-la-slider','proof-ls-slider','proof-lp-slider','proof-vol-slider',
     'proof-k-la-slider','proof-k-ls-slider','proof-k-lp-slider','proof-k-vol-slider',
     'proof-b-lp-slider', 'proof-b-vol-slider'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = 0;
    });
    DOM.net.disabled = false; DOM.net.style.opacity = '1'; DOM.net.style.cursor = 'pointer';
    if (isBola) {
        DOM.pecahGroup.style.display     = 'flex';
        DOM.transmuteGroup.style.display = 'flex';
        DOM.transmute.disabled = true; DOM.transmute.style.opacity = '0.4'; DOM.transmute.style.cursor = 'not-allowed';
    } else {
        DOM.pecahGroup.style.display     = 'none';
        DOM.transmuteGroup.style.display = 'none';
    }

    // reset state khusus sisi datar setiap kali ganti bangun
    if (DOM.netDatarSlider) DOM.netDatarSlider.value = 0;
    if (DOM.luasDatarSlider) DOM.luasDatarSlider.value = 0;
    if (DOM.volDatarSlider) DOM.volDatarSlider.value = 0;
    diagBidangOn = false; diagRuangOn = false; diagBDiagonalOn = false;
    updateDiagonalButtonUI();

    updateScene();
    _syncingShape = false;
}

if (_shapeDesktop) _shapeDesktop.addEventListener('change', () => onShapeChange(_shapeDesktop));
if (_shapeMobile)  _shapeMobile.addEventListener('change',  () => onShapeChange(_shapeMobile));

DOM.pecah.addEventListener('input', () => {
    let pecahVal = parseFloat(DOM.pecah.value);
    let transVal = parseFloat(DOM.transmute.value);
    if (transVal > 0 && pecahVal < 20) { DOM.pecah.value = 20; pecahVal = 20; }
    if (pecahVal < 20) {
        DOM.transmute.disabled = true; DOM.transmute.style.opacity = '0.4'; DOM.transmute.style.cursor = 'not-allowed';
        if (DOM.transmuteHint) DOM.transmuteHint.style.display = 'block';
    } else {
        DOM.transmute.disabled = false; DOM.transmute.style.opacity = '1'; DOM.transmute.style.cursor = 'pointer';
        if (DOM.transmuteHint) DOM.transmuteHint.style.display = 'none';
    }
    updateScene();
});

DOM.transmute.addEventListener('input', () => {
    if (parseFloat(DOM.pecah.value) < 20) DOM.transmute.value = 0;
    updateScene();
});

DOM.r.addEventListener('input', updateScene);
DOM.t.addEventListener('input', updateScene);
DOM.net.addEventListener('input', updateScene);

const proofSlidersAll = [
    'proof-la-slider', 'proof-ls-slider', 'proof-lp-slider', 'proof-vol-slider',
    'proof-k-la-slider', 'proof-k-ls-slider', 'proof-k-lp-slider', 'proof-k-vol-slider',
    'proof-b-lp-slider', 'proof-b-vol-slider'
];
proofSlidersAll.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
        const val = parseFloat(el.value);
        if (val > 0) {
            proofSlidersAll.forEach(otherId => {
                if (otherId !== id) { const other = document.getElementById(otherId); if (other) other.value = 0; }
            });
        }
        if (['proof-la-slider','proof-lp-slider','proof-k-la-slider','proof-k-ls-slider','proof-k-lp-slider'].includes(id)) {
            triggerGlow(val/100); startGlowLoop();
        }
        updateScene();
    });
});

let glowLoopId = null;
function startGlowLoop() {
    if (glowLoopId) return;
    glowLoopId = setInterval(() => {
        const gp = getGlowProgress();
        updateScene();
        if (gp <= 0) { clearInterval(glowLoopId); glowLoopId = null; updateScene(); }
    }, 16);
}

function togglePanel() {
    const panel   = document.getElementById('ui-panel');
    const overlay = document.getElementById('overlay');
    panel.classList.toggle('open');
    overlay.classList.toggle('active');
}
function closePanel() {
    document.getElementById('ui-panel').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
}
const btnPanel = document.getElementById('btn-panel');
if (btnPanel) btnPanel.addEventListener('click', togglePanel);

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

if (DOM.transmuteHint) DOM.transmuteHint.style.display = 'block';

/* =====================================================================
   =====================  BANGUN RUANG SISI DATAR  =====================
   (Kubus, Balok, Prisma segi-n, Limas segi-n | n = 3..6)

   Catatan teknik jaring-jaring: menggunakan interpolasi posisi vertex
   (closed -> open), teknik yang SAMA dengan selimut tabung/kerucut di
   atas, BUKAN rotasi engsel. Ini pilihan sadar demi konsistensi gaya
   kode dan menghindari bug komposisi rotasi berlapis.

   Catatan jujur soal akurasi net: untuk kubus/balok, jaring-jaring yang
   dihasilkan adalah net silang yang valid secara geometris (semua sisi
   match persis). Untuk prisma/limas segi-n, sisi tegak/miringnya dibuka
   secara presisi (pakai rumus apotema & garis tinggi/tinggi miring,
   sama seperti teknik kerucut), TAPI posisi tutup atas prisma di net
   memakai pendekatan (bukan hasil hitungan presisi penuh) karena kalau
   dipaksakan pas untuk n=3..6 sekaligus, risikonya jauh lebih besar
   dari manfaat visualnya. Ini trade-off yang saya pilih sadar, bukan
   kelalaian.
   ===================================================================== */

// ---- state diagonal (khusus kubus & balok, bisa aktif bareng) ----
let diagBidangOn = false;
let diagRuangOn  = false;
let diagBDiagonalOn = false;

function updatePanelVisibilityForShape(shape) {
    const isDatar = isDatarShape(shape);

    if (DOM.dimLengkungBlock) DOM.dimLengkungBlock.style.display = isDatar ? 'none' : 'block';
    if (DOM.mathPanel)        DOM.mathPanel.style.display        = isDatar ? 'none' : 'block';
    if (DOM.netLengkungBlock) DOM.netLengkungBlock.style.display = isDatar ? 'none' : 'block';
    if (isDatar) {
        DOM.pecahGroup.style.display     = 'none';
        DOM.transmuteGroup.style.display = 'none';
        if (DOM.proofTGroup) DOM.proofTGroup.style.display = 'none';
        if (DOM.proofKGroup) DOM.proofKGroup.style.display = 'none';
        if (DOM.proofBGroup) DOM.proofBGroup.style.display = 'none';
    }

    if (DOM.dimDatarBlock)  DOM.dimDatarBlock.style.display  = isDatar ? 'block' : 'none';
    if (DOM.mathPanelDatar) DOM.mathPanelDatar.style.display = isDatar ? 'block' : 'none';
    if (DOM.brsdAnimationNav) DOM.brsdAnimationNav.style.display = isDatar ? 'block' : 'none';
    updateDatarAnimationControls(shape);
    if (DOM.diagonalGroup)  DOM.diagonalGroup.style.display  = (shape === 'kubus' || shape === 'balok') ? 'block' : 'none';

    document.querySelectorAll('.dim-datar').forEach(el => {
        const shapes = (el.dataset.shapes || '').split(',');
        el.style.display = shapes.indexOf(shape) !== -1 ? 'flex' : 'none';
    });
}

function updateDatarAnimationControls(shape) {
    const isDatar = isDatarShape(shape);
    if (DOM.netDatarBlock) DOM.netDatarBlock.style.display = isDatar ? 'block' : 'none';
    if (DOM.brsdAnimationNav) DOM.brsdAnimationNav.style.display = isDatar ? 'block' : 'none';
    if (DOM.brsdAnimTitle) DOM.brsdAnimTitle.textContent = '📐 Animasi ' + datarShapeTitle(shape);
    if (DOM.animDatarBlock) DOM.animDatarBlock.style.display = 'none';
    if (DOM.luasDatarControl) DOM.luasDatarControl.style.display = 'flex';
    if (DOM.volDatarControl) DOM.volDatarControl.style.display = 'flex';
}
function clampN(n) { return Math.max(3, Math.min(6, n)); }

if (DOM.nMinus) DOM.nMinus.addEventListener('click', () => {
    let n = clampN(parseInt(DOM.nVal.textContent) - 1);
    DOM.nVal.textContent = n;
    updateScene();
});
if (DOM.nPlus) DOM.nPlus.addEventListener('click', () => {
    let n = clampN(parseInt(DOM.nVal.textContent) + 1);
    DOM.nVal.textContent = n;
    updateScene();
});

function getDatarDims(shape) {
    if (shape === 'kubus') {
        const s = parseFloat(DOM.sSlider.value);
        return { W: s, D: s, H: s };
    }
    if (shape === 'balok') {
        return { W: parseFloat(DOM.pSlider.value), D: parseFloat(DOM.lSlider.value), H: parseFloat(DOM.tbSlider.value) };
    }
    // prisma / limas
    return { n: clampN(parseInt(DOM.nVal.textContent)), a: parseFloat(DOM.aSlider.value), t: parseFloat(DOM.tplSlider.value) };
}

function polygonGeomInfo(n, a) {
    const R = a / (2 * Math.sin(Math.PI / n));
    const apothem = R * Math.cos(Math.PI / n);
    const pts = [];
    for (let i = 0; i < n; i++) {
        const theta = -Math.PI / 2 + i * (2 * Math.PI / n);
        pts.push({ x: R * Math.cos(theta), z: R * Math.sin(theta) });
    }
    return { R, apothem, pts };
}

function makeQuadGeometry(c0, c1, c2, c3, o0, o1, o2, o3, u) {
    // dua segitiga (non-indexed), posisi = lerp(closed, open, u)
    const positions = new Float32Array(6 * 3);
    const tris = [[c0,c1,c2,o0,o1,o2],[c0,c2,c3,o0,o2,o3]];
    let idx = 0;
    tris.forEach(tri => {
        for (let k = 0; k < 3; k++) {
            const c = tri[k], o = tri[k+3];
            positions[idx*3+0] = lerp(c.x, o.x, u);
            positions[idx*3+1] = lerp(c.y, o.y, u);
            positions[idx*3+2] = lerp(c.z, o.z, u);
            idx++;
        }
    });
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    return geom;
}

function makeTriGeometry(c0, c1, c2, o0, o1, o2, u) {
    const positions = new Float32Array(3 * 3);
    const tri = [c0,c1,c2], op = [o0,o1,o2];
    for (let k = 0; k < 3; k++) {
        positions[k*3+0] = lerp(tri[k].x, op[k].x, u);
        positions[k*3+1] = lerp(tri[k].y, op[k].y, u);
        positions[k*3+2] = lerp(tri[k].z, op[k].z, u);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    return geom;
}

function faceMaterial(baseColorHex, p_luas, opacity, faceIndex=0, totalFaces=1) {
    const localProgress = surfaceFaceProgress(p_luas, faceIndex, totalFaces);
    let colorHex = baseColorHex;
    if (localProgress > 0) {
        const base = new THREE.Color(baseColorHex);
        const gold = new THREE.Color(COLOR_LUAS_ANIM);
        const mixed = base.clone().lerp(gold, localProgress);
        return new THREE.MeshStandardMaterial({ color: mixed, side: THREE.DoubleSide, roughness: 0.15, metalness: 0.03, transparent: isTrans, opacity });
    }
    return new THREE.MeshStandardMaterial({ color: colorHex, side: THREE.DoubleSide, roughness: 0.15, metalness: 0.03, transparent: isTrans, opacity });
}

function addFaceToGroup(group, geom, mat, addEdges) {
    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);
    if (addEdges) {
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 25), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
        group.add(edges);
    }
}

// ---- KUBUS & BALOK (net silang, 6 sisi) ----
function buildBoxDatar(W, D, H, p_net, p_luas, baseColorHex) {
    const hw = W/2, hd = D/2, hh = H/2;
    const opacity = isTrans ? 0.5 : 1.0;
    const group = new THREE.Group();
    const u = clamp01(p_net);
    const a90 = u * Math.PI / 2;
    const totalFaces = 6;
    const matAt = idx => faceMaterial(baseColorHex, p_luas, opacity, idx, totalFaces);
    const C = {
        c000:{x:-hw,y:-hh,z:-hd}, c100:{x:hw,y:-hh,z:-hd}, c010:{x:-hw,y:hh,z:-hd}, c110:{x:hw,y:hh,z:-hd},
        c001:{x:-hw,y:-hh,z:hd}, c101:{x:hw,y:-hh,z:hd}, c011:{x:-hw,y:hh,z:hd}, c111:{x:hw,y:hh,z:hd}
    };
    addFaceToGroup(group, makeQuadFromPoints(C.c000,C.c100,C.c101,C.c001), matAt(0), isTrans);
    const frontAxisA = C.c001, frontAxisB = C.c101;
    const front = [C.c001, C.c101, C.c111, C.c011].map(p => rotatePointAroundAxis(p, frontAxisA, frontAxisB, a90));
    addFaceToGroup(group, makeQuadFromPoints(front[0],front[1],front[2],front[3]), matAt(1), isTrans);
    const backAxisA = C.c000, backAxisB = C.c100;
    const back = [C.c000, C.c100, C.c110, C.c010].map(p => rotatePointAroundAxis(p, backAxisA, backAxisB, -a90));
    addFaceToGroup(group, makeQuadFromPoints(back[0],back[1],back[2],back[3]), matAt(2), isTrans);
    const leftAxisA = C.c000, leftAxisB = C.c001;
    const left = [C.c000, C.c001, C.c011, C.c010].map(p => rotatePointAroundAxis(p, leftAxisA, leftAxisB, a90));
    addFaceToGroup(group, makeQuadFromPoints(left[0],left[1],left[2],left[3]), matAt(3), isTrans);
    const rightAxisA = C.c100, rightAxisB = C.c101;
    const right = [C.c100, C.c101, C.c111, C.c110].map(p => rotatePointAroundAxis(p, rightAxisA, rightAxisB, -a90));
    addFaceToGroup(group, makeQuadFromPoints(right[0],right[1],right[2],right[3]), matAt(4), isTrans);
    const topLocalAxisA = C.c011, topLocalAxisB = C.c111;
    const top = [C.c011, C.c111, C.c110, C.c010]
        .map(p => rotatePointAroundAxis(p, topLocalAxisA, topLocalAxisB, a90))
        .map(p => rotatePointAroundAxis(p, frontAxisA, frontAxisB, a90));
    addFaceToGroup(group, makeQuadFromPoints(top[0],top[1],top[2],top[3]), matAt(5), isTrans);
    datarGroup.add(group);
    return C;
}

function addBoxDiagonals(C, W, D, H) {
    const addLine = (p1, p2, radius=0.065, opacity=1) => {
        addCylinderBetweenPoints(datarGroup, p1, p2, radius, COLOR_DIAG_BIDANG, { transparent: opacity < 1, opacity, depthTest: false, depthWrite: false, emissiveIntensity: 0.75, renderOrder: 35 });
    };
    const addPlane = (p1, p2, p3, p4) => {
        const geom = makeQuadFromPoints(p1, p2, p3, p4);
        const mat = new THREE.MeshStandardMaterial({ color: COLOR_BIDANG_DIAGONAL, emissive: COLOR_BIDANG_DIAGONAL, emissiveIntensity: 0.18, side: THREE.DoubleSide, transparent: true, opacity: 0.30, depthWrite: false, depthTest: false, roughness: 0.22 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.renderOrder = 25;
        datarGroup.add(mesh);
    };
    if (diagBidangOn) {
        addLine(C.c001, C.c111, 0.085, 1);
    }
    if (diagRuangOn) {
        addLine(C.c000, C.c111, 0.095, 1);
    }
    if (diagBDiagonalOn) {
        addPlane(C.c000, C.c010, C.c111, C.c101);
    }
}

function fillBox(cx, cy_bot, cz, W, D, H_water, H_total, mats) {
    if (H_water <= 0.001) return;
    const isFull = H_water >= H_total * 0.999;
    if (isFull) {
        const full = new THREE.Mesh(new THREE.BoxGeometry(W*0.997, H_total, D*0.997), mats.solid);
        full.renderOrder = 80;
        full.position.set(cx, cy_bot + H_total/2, cz); datarGroup.add(full); return;
    }
    const yCenter = cy_bot + H_water/2; const yTop = cy_bot + H_water;
    const side = new THREE.Mesh(new THREE.BoxGeometry(W*0.997, H_water, D*0.997), mats.front);
    side.position.set(cx, yCenter, cz); datarGroup.add(side);
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(W*0.997, D*0.997), mats.surf);
    surf.rotation.x = -Math.PI/2; surf.position.set(cx, yTop, cz); datarGroup.add(surf);
}

// ---- PRISMA & LIMAS (segi-n, n=3..6) ----
function buildPrismaDatar(n, a, t, p_net, p_luas, baseColorHex) {
    const { R, apothem, pts } = polygonGeomInfo(n, a);
    const hh = t/2, opacity = isTrans ? 0.5 : 1.0;
    const group = new THREE.Group();
    const totalFaces = n + 2;
    const matAt = idx => faceMaterial(baseColorHex, p_luas, opacity, idx, totalFaces);

    if (n === 3) {
        const u = clamp01(p_net);
        const P = pts.map(p => ({ x:p.x, y:-hh, z:p.z }));
        const Q = pts.map(p => ({ x:p.x, y: hh, z:p.z }));
        const A = P[0], B = P[1], C = P[2];
        const At = Q[0], Bt = Q[1], Ct = Q[2];

        const edge = pointToVector(B).sub(pointToVector(A));
        const edgeDir = edge.clone().normalize();
        const heightDir = pointToVector(At).sub(pointToVector(A)).normalize();
        const triHeight = Math.sqrt(Math.max(0, a*a - (a/2)*(a/2)));

        // Satu sisi persegi panjang ini menjadi poros utama dan tetap diam saat jaring-jaring dibuka.
        addFaceToGroup(group, makeQuadFromPoints(A, B, Bt, At), matAt(1), isTrans);

        const rightBaseTarget = { x:B.x + edgeDir.x*a, y:B.y + edgeDir.y*a, z:B.z + edgeDir.z*a };
        const rightTopTarget = { x:Bt.x + edgeDir.x*a, y:Bt.y + edgeDir.y*a, z:Bt.z + edgeDir.z*a };
        const rightBase = rotatePointTowardAroundAxis(C, B, Bt, rightBaseTarget, u);
        const rightTop = rotatePointTowardAroundAxis(Ct, B, Bt, rightTopTarget, u);
        addFaceToGroup(group, makeQuadFromPoints(B, rightBase, rightTop, Bt), matAt(2), isTrans);

        const leftBaseTarget = { x:A.x - edgeDir.x*a, y:A.y - edgeDir.y*a, z:A.z - edgeDir.z*a };
        const leftTopTarget = { x:At.x - edgeDir.x*a, y:At.y - edgeDir.y*a, z:At.z - edgeDir.z*a };
        const leftBase = rotatePointTowardAroundAxis(C, A, At, leftBaseTarget, u);
        const leftTop = rotatePointTowardAroundAxis(Ct, A, At, leftTopTarget, u);
        addFaceToGroup(group, makeQuadFromPoints(leftBase, A, At, leftTop), matAt(3), isTrans);

        const bottomMid = midpoint3(A, B);
        const bottomTipTarget = {
            x: bottomMid.x - heightDir.x*triHeight,
            y: bottomMid.y - heightDir.y*triHeight,
            z: bottomMid.z - heightDir.z*triHeight
        };
        const bottomTip = rotatePointTowardAroundAxis(C, A, B, bottomTipTarget, u);
        addFaceToGroup(group, makeTriFromPoints(A, B, bottomTip), matAt(0), isTrans);

        const topMid = midpoint3(At, Bt);
        const topTipTarget = {
            x: topMid.x + heightDir.x*triHeight,
            y: topMid.y + heightDir.y*triHeight,
            z: topMid.z + heightDir.z*triHeight
        };
        const topTip = rotatePointTowardAroundAxis(Ct, At, Bt, topTipTarget, u);
        addFaceToGroup(group, makeTriFromPoints(At, Bt, topTip), matAt(4), isTrans);

        datarGroup.add(group);
        return { R, apothem, pts };
    }

    {
        const positions = [];
        for (let i = 0; i < n; i++) positions.push({x:0,y:-hh,z:0}, {x:pts[i].x,y:-hh,z:pts[i].z}, {x:pts[(i+1)%n].x,y:-hh,z:pts[(i+1)%n].z});
        const geom = new THREE.BufferGeometry();
        const arr = new Float32Array(positions.length*3);
        positions.forEach((p,idx)=>{ arr[idx*3]=p.x; arr[idx*3+1]=p.y; arr[idx*3+2]=p.z; });
        geom.setAttribute('position', new THREE.BufferAttribute(arr,3)); geom.computeVertexNormals();
        addFaceToGroup(group, geom, matAt(0), false);
        addPolygonOutline(group, pts.map(p => ({x:p.x,y:-hh,z:p.z})));
    }
    let firstFace = null;
    for (let i = 0; i < n; i++) {
        const i2 = (i+1)%n;
        const mx = (pts[i].x+pts[i2].x)/2, mz = (pts[i].z+pts[i2].z)/2;
        const len = Math.sqrt(mx*mx+mz*mz) || 1, nx = mx/len, nz = mz/len;
        const A = {x:pts[i].x, y:-hh, z:pts[i].z}, B = {x:pts[i2].x, y:-hh, z:pts[i2].z};
        const Cc = {x:pts[i2].x, y:hh, z:pts[i2].z}, Dc = {x:pts[i].x, y:hh, z:pts[i].z};
        const Co = {x:B.x+nx*t, y:-hh, z:B.z+nz*t}, Do = {x:A.x+nx*t, y:-hh, z:A.z+nz*t};
        const geom = makeQuadFromPoints(A, B, rotatePointTowardAroundAxis(Cc, A, B, Co, p_net), rotatePointTowardAroundAxis(Dc, A, B, Do, p_net));
        addFaceToGroup(group, geom, matAt(i+1), isTrans);
        if (i === 0) firstFace = { A, B, Cc, Dc, mx, mz, Co };
    }
    if (firstFace) {
        const edgeTopA = firstFace.Dc, edgeTopB = firstFace.Cc, edgeBotA = firstFace.A, edgeBotB = firstFace.B;
        const targetCenter = { x:firstFace.mx, y:hh+apothem, z:firstFace.mz };
        const capLiftAngle = signedAngleAroundAxis({x:0,y:hh,z:0}, edgeTopA, edgeTopB, targetCenter);
        const sideFoldAngle = signedAngleAroundAxis(firstFace.Cc, edgeBotA, edgeBotB, firstFace.Co);
        const foldedOuter = pts.map(p => ({x:p.x,y:hh,z:p.z}))
            .map(p => rotatePointAroundAxis(p, edgeTopA, edgeTopB, capLiftAngle * clamp01(p_net)))
            .map(p => rotatePointAroundAxis(p, edgeBotA, edgeBotB, sideFoldAngle * clamp01(p_net)));
        const foldedCenter = rotatePointAroundAxis(
            rotatePointAroundAxis({x:0,y:hh,z:0}, edgeTopA, edgeTopB, capLiftAngle * clamp01(p_net)),
            edgeBotA, edgeBotB, sideFoldAngle * clamp01(p_net)
        );
        for (let i = 0; i < n; i++) {
            addFaceToGroup(group, makeTriFromPoints(foldedCenter, foldedOuter[i], foldedOuter[(i+1)%n]), matAt(n+1), false);
        }
        addPolygonOutline(group, foldedOuter);
    }
    if (p_net < 0.01 && isTrans && n >= 4) {
        addBaseDiagonalDetails(group, pts, -hh, -1);
        addBaseDiagonalDetails(group, pts, hh, 1);
    }
    datarGroup.add(group);
    return { R, apothem, pts };
}

function buildLimasDatar(n, a, t, p_net, p_luas, baseColorHex) {
    const { R, apothem, pts } = polygonGeomInfo(n, a);
    const hh = t/2, opacity = isTrans ? 0.5 : 1.0;
    const group = new THREE.Group();
    const L = Math.sqrt(t*t + apothem*apothem);
    const totalFaces = n + 1;
    const matAt = idx => faceMaterial(baseColorHex, p_luas, opacity, idx, totalFaces);
    {
        let geom;
        if (n === 3) {
            geom = makeTriFromPoints(
                {x:pts[0].x,y:-hh,z:pts[0].z},
                {x:pts[1].x,y:-hh,z:pts[1].z},
                {x:pts[2].x,y:-hh,z:pts[2].z}
            );
        } else {
            const positions = [];
            for (let i = 0; i < n; i++) positions.push({x:0,y:-hh,z:0}, {x:pts[i].x,y:-hh,z:pts[i].z}, {x:pts[(i+1)%n].x,y:-hh,z:pts[(i+1)%n].z});
            geom = new THREE.BufferGeometry();
            const arr = new Float32Array(positions.length*3);
            positions.forEach((p,idx)=>{ arr[idx*3]=p.x; arr[idx*3+1]=p.y; arr[idx*3+2]=p.z; });
            geom.setAttribute('position', new THREE.BufferAttribute(arr,3)); geom.computeVertexNormals();
        }
        addFaceToGroup(group, geom, matAt(0), isTrans);
    }
    for (let i = 0; i < n; i++) {
        const i2 = (i+1)%n;
        const mx = (pts[i].x+pts[i2].x)/2, mz = (pts[i].z+pts[i2].z)/2;
        const len = Math.sqrt(mx*mx+mz*mz) || 1, nx = mx/len, nz = mz/len;
        const A = {x:pts[i].x, y:-hh, z:pts[i].z}, B = {x:pts[i2].x, y:-hh, z:pts[i2].z};
        const Apex = {x:0, y:hh, z:0};
        const Co = {x:nx*(apothem+L), y:-hh, z:nz*(apothem+L)};
        addFaceToGroup(group, makeTriFromPoints(A, B, rotatePointTowardAroundAxis(Apex, A, B, Co, p_net)), matAt(i+1), isTrans);
    }
    if (p_net < 0.01 && isTrans && n >= 4) {
        addBaseDiagonalDetails(group, pts, -hh, -1);
    }
    datarGroup.add(group);
    return { R, apothem, pts, L };
}

function buildPolyCap(pts, y) {
    const n = pts.length;
    const arr = [];
    for (let i = 0; i < n; i++) {
        const i2 = (i+1)%n;
        arr.push(0,y,0, pts[i].x,y,pts[i].z, pts[i2].x,y,pts[i2].z);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3));
    geom.computeVertexNormals();
    return geom;
}

function buildPolySide(ptsBase, yBase, ptsTop, yTop) {
    const n = ptsBase.length;
    const arr = [];
    for (let i = 0; i < n; i++) {
        const i2 = (i+1)%n;
        const A={x:ptsBase[i].x,y:yBase,z:ptsBase[i].z}, B={x:ptsBase[i2].x,y:yBase,z:ptsBase[i2].z};
        const Cc={x:ptsTop[i2].x,y:yTop,z:ptsTop[i2].z}, Dd={x:ptsTop[i].x,y:yTop,z:ptsTop[i].z};
        arr.push(A.x,A.y,A.z, B.x,B.y,B.z, Cc.x,Cc.y,Cc.z);
        arr.push(A.x,A.y,A.z, Cc.x,Cc.y,Cc.z, Dd.x,Dd.y,Dd.z);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3));
    geom.computeVertexNormals();
    return geom;
}

// Air prisma: pakai pts[] yang SAMA dengan dinding aslinya, dijamin sejajar (bukan tebakan rotasi)
function fillPrismVol(cx, cy_bot, cz, pts, H_water, H_total, mats) {
    if (H_water <= 0.001) return;
    const isFull = H_water >= H_total * 0.999;
    const grp = new THREE.Group(); grp.position.set(cx, 0, cz);
    if (isFull) {
        [buildPolySide(pts, cy_bot, pts, cy_bot + H_total), buildPolyCap(pts, cy_bot + H_total), buildPolyCap(pts, cy_bot)].forEach(geom => {
            const mesh = new THREE.Mesh(geom, mats.solid);
            mesh.renderOrder = 80;
            grp.add(mesh);
        });
        datarGroup.add(grp); return;
    }
    grp.add(new THREE.Mesh(buildPolySide(pts, cy_bot, pts, cy_bot + H_water), mats.front));
    grp.add(new THREE.Mesh(buildPolyCap(pts, cy_bot + H_water), mats.surf));
    grp.add(new THREE.Mesh(buildPolyCap(pts, cy_bot), mats.surf));
    datarGroup.add(grp);
}

// Air limas: penampang mengecil linear menuju puncak (skala = sisa tinggi / tinggi total)
function fillLimasVol(cx, cy_bot, cz, pts, H_total, frac, mats) {
    if (frac <= 0.001) return;
    const Hw = frac * H_total; const isFull = frac >= 0.999;
    const grp = new THREE.Group(); grp.position.set(cx, 0, cz);
    if (isFull) {
        const apexPts = pts.map(() => ({ x: 0, z: 0 }));
        [buildPolySide(pts, cy_bot, apexPts, cy_bot + H_total), buildPolyCap(pts, cy_bot)].forEach(geom => {
            const mesh = new THREE.Mesh(geom, mats.solid);
            mesh.renderOrder = 80;
            grp.add(mesh);
        });
        datarGroup.add(grp); return;
    }
    const scale = (H_total - Hw) / H_total;
    const scaledPts = pts.map(p => ({ x: p.x * scale, z: p.z * scale }));
    grp.add(new THREE.Mesh(buildPolySide(pts, cy_bot, scaledPts, cy_bot + Hw), mats.front));
    grp.add(new THREE.Mesh(buildPolyCap(scaledPts, cy_bot + Hw), mats.surf));
    grp.add(new THREE.Mesh(buildPolyCap(pts, cy_bot), mats.surf));
    datarGroup.add(grp);
}

function addDatarDimLabel(shape, dims) {
    if (!isTrans) return;
    if (shape === 'kubus') {
        const s = dims.W;
        addCylinderBetweenPoints(datarGroup, {x:-s/2,y:-s/2,z:s/2}, {x:s/2,y:-s/2,z:s/2}, 0.06, COLOR_DIM_LABEL, { depthTest:false });
        const lbl = makeLabel("s", COLOR_DIM_LABEL); lbl.position.set(0, -s/2+0.6, s/2); datarGroup.add(lbl);
    } else if (shape === 'balok') {
        const { W, D, H } = dims;
        addCylinderBetweenPoints(datarGroup, {x:-W/2,y:-H/2,z:D/2}, {x:W/2,y:-H/2,z:D/2}, 0.06, COLOR_DIM_LABEL, { depthTest:false });
        const lblP = makeLabel("p", COLOR_DIM_LABEL); lblP.position.set(0,-H/2+0.6,D/2); datarGroup.add(lblP);
        addCylinderBetweenPoints(datarGroup, {x:W/2,y:-H/2,z:-D/2}, {x:W/2,y:-H/2,z:D/2}, 0.06, COLOR_DIM_LABEL, { depthTest:false });
        const lblL = makeLabel("l", COLOR_DIM_LABEL); lblL.position.set(W/2,-H/2+0.6,0); datarGroup.add(lblL);
        addCylinderBetweenPoints(datarGroup, {x:W/2,y:-H/2,z:D/2}, {x:W/2,y:H/2,z:D/2}, 0.06, COLOR_DIM_LABEL, { depthTest:false });
        const lblT = makeLabel("t", COLOR_DIM_LABEL); lblT.position.set(W/2+0.6,0,D/2); datarGroup.add(lblT);
    } else if (shape === 'prisma' || shape === 'limas') {
        const info = polygonGeomInfo(dims.n, dims.a), hh = dims.t/2;
        const edgeIndex = pickReadableBaseEdge(info.pts);
        const p0Raw = info.pts[edgeIndex], p1Raw = info.pts[(edgeIndex + 1) % dims.n];
        const p0 = { x:p0Raw.x, y:-hh, z:p0Raw.z }, p1 = { x:p1Raw.x, y:-hh, z:p1Raw.z };
        const mid = midpoint3(p0, p1);
        const outwardLen = Math.sqrt(mid.x*mid.x + mid.z*mid.z) || 1;
        const ox = mid.x / outwardLen, oz = mid.z / outwardLen;
        addCylinderBetweenPoints(datarGroup, p0, p1, 0.065, COLOR_DIM_LABEL, { depthTest:false, emissiveIntensity:0.55 });
        const lblA = makeLabel("a", COLOR_DIM_LABEL); lblA.position.set(mid.x + ox*0.35, -hh + 0.48, mid.z + oz*0.35); lblA.scale.set(4.7, 1.55, 1); datarGroup.add(lblA);
        if (shape === 'prisma') {
            const sBaseStart = prismApothemLineStart(info.pts, edgeIndex);
            const sY = -hh - 0.12;
            const sStart = { x:sBaseStart.x, y:sY, z:sBaseStart.z };
            const sEnd = { x:mid.x, y:sY, z:mid.z };
            addCylinderBetweenPoints(datarGroup, sStart, sEnd, 0.06, COLOR_DIM_LABEL, { depthTest:false, depthWrite:false, emissiveIntensity:0.85, renderOrder:55 });
            const lblS = makeLabel("s", COLOR_DIM_LABEL);
            lblS.position.set((sStart.x+sEnd.x)/2 + ox*0.28, sY + 0.48, (sStart.z+sEnd.z)/2 + oz*0.28);
            lblS.scale.set(4.7, 1.55, 1); datarGroup.add(lblS);
            addCylinderBetweenPoints(datarGroup, {x:0,y:-hh,z:0}, {x:0,y:hh,z:0}, 0.055, COLOR_DIM_LABEL, { depthTest:false });
            const lblT = makeLabel("t", COLOR_DIM_LABEL); lblT.position.set(0.6,0,0); datarGroup.add(lblT);
        } else {
            const apex = { x:0, y:hh, z:0 };
            addCylinderBetweenPoints(datarGroup, mid, apex, 0.055, COLOR_DIM_LABEL, { depthTest:false, emissiveIntensity:0.55 });
            const lblS = makeLabel("s", COLOR_DIM_LABEL); lblS.position.set(mid.x*0.5 + ox*0.3, (mid.y+apex.y)/2, mid.z*0.5 + oz*0.3); lblS.scale.set(4.7, 1.55, 1); datarGroup.add(lblS);
            addCylinderBetweenPoints(datarGroup, {x:0,y:-hh,z:0}, apex, 0.055, COLOR_DIM_LABEL, { depthTest:false });
            const lblT = makeLabel("t", COLOR_DIM_LABEL); lblT.position.set(0.6,0,0); datarGroup.add(lblT);
        }
    }
}

function updateDiagonalButtonUI() {
    if (DOM.btnDiagBidang) DOM.btnDiagBidang.classList.toggle('active', diagBidangOn);
    if (DOM.btnDiagRuang)  DOM.btnDiagRuang.classList.toggle('active', diagRuangOn);
    if (DOM.btnDiagBDiag)  DOM.btnDiagBDiag.classList.toggle('active', diagBDiagonalOn);
}

if (DOM.btnDiagBidang) DOM.btnDiagBidang.addEventListener('click', () => {
    const next = !diagBidangOn;
    diagBidangOn = next; diagRuangOn = false; diagBDiagonalOn = false;
    updateDiagonalButtonUI(); updateScene();
});
if (DOM.btnDiagRuang)  DOM.btnDiagRuang.addEventListener('click',  () => {
    const next = !diagRuangOn;
    diagBidangOn = false; diagRuangOn = next; diagBDiagonalOn = false;
    updateDiagonalButtonUI(); updateScene();
});
if (DOM.btnDiagBDiag)  DOM.btnDiagBDiag.addEventListener('click',  () => {
    const next = !diagBDiagonalOn;
    diagBidangOn = false; diagRuangOn = false; diagBDiagonalOn = next;
    updateDiagonalButtonUI(); updateScene();
});

if (DOM.sSlider)   DOM.sSlider.addEventListener('input', updateScene);
if (DOM.pSlider)   DOM.pSlider.addEventListener('input', updateScene);
if (DOM.lSlider)   DOM.lSlider.addEventListener('input', updateScene);
if (DOM.tbSlider)  DOM.tbSlider.addEventListener('input', updateScene);
if (DOM.aSlider)   DOM.aSlider.addEventListener('input', updateScene);
if (DOM.tplSlider) DOM.tplSlider.addEventListener('input', updateScene);

if (DOM.netDatarSlider) DOM.netDatarSlider.addEventListener('input', () => {
    if (parseFloat(DOM.netDatarSlider.value) > 0) { DOM.luasDatarSlider.value = 0; DOM.volDatarSlider.value = 0; }
    updateScene();
});
if (DOM.luasDatarSlider) DOM.luasDatarSlider.addEventListener('input', () => {
    if (parseFloat(DOM.luasDatarSlider.value) > 0) { DOM.netDatarSlider.value = 0; DOM.volDatarSlider.value = 0; }
    triggerGlow(parseFloat(DOM.luasDatarSlider.value) / 100); startGlowLoop();
    updateScene();
});
if (DOM.volDatarSlider) DOM.volDatarSlider.addEventListener('input', () => {
    if (parseFloat(DOM.volDatarSlider.value) > 0) { DOM.netDatarSlider.value = 0; DOM.luasDatarSlider.value = 0; }
    updateScene();
});

function updateMathDatar(shape, dims) {
    let laText='-', lpText='-', vText='-', la=0, lp=0, v=0;
    if (shape === 'kubus') {
        const s = dims.W; la = s*s; lp = 6*s*s; v = s*s*s;
        laText = varHTML('s<sup>2</sup>'); lpText = varHTML('6s<sup>2</sup>'); vText = varHTML('s<sup>3</sup>');
    } else if (shape === 'balok') {
        const { W:p, D:l, H:t2 } = dims; la = p*l; lp = 2*(p*l + p*t2 + l*t2); v = p*l*t2;
        laText = varHTML('p') + opHTML('&times;') + varHTML('l');
        lpText = varHTML('2') + opHTML('&times;') + varHTML('(pl + pt + lt)');
        vText = varHTML('p') + opHTML('&times;') + varHTML('l') + opHTML('&times;') + varHTML('t');
    } else if (shape === 'prisma') {
        const { n, a, t: tp } = dims; const info = polygonGeomInfo(n, a); la = 0.5*n*a*info.apothem; lp = 2*la + n*a*tp; v = la*tp;
        laText = fracHTML('1','2') + opHTML('&times;') + varHTML('n') + opHTML('&times;') + varHTML('a') + opHTML('&times;') + varHTML('s');
        lpText = varHTML('2') + opHTML('&times;') + varHTML('L<sub>alas</sub>') + opHTML('+') + varHTML('K<sub>alas</sub>') + opHTML('&times;') + varHTML('t');
        vText = varHTML('L<sub>alas</sub>') + opHTML('&times;') + varHTML('t');
    } else if (shape === 'limas') {
        const { n, a, t: tp } = dims; const info = polygonGeomInfo(n, a); const L = Math.sqrt(tp*tp + info.apothem*info.apothem);
        la = 0.5*n*a*info.apothem; lp = la + 0.5*n*a*L; v = (1/3)*la*tp;
        laText = fracHTML('1','2') + opHTML('&times;') + varHTML('n') + opHTML('&times;') + varHTML('a') + opHTML('&times;') + varHTML('s<sub>alas</sub>');
        lpText = varHTML('L<sub>alas</sub>') + opHTML('+') + fracHTML('1','2') + opHTML('&times;') + varHTML('n') + opHTML('&times;') + varHTML('a') + opHTML('&times;') + varHTML('s');
        vText = fracHTML('1','3') + opHTML('&times;') + varHTML('L<sub>alas</sub>') + opHTML('&times;') + varHTML('t');
    }
    if (DOM.fDatarLa) DOM.fDatarLa.innerHTML = laText;
    if (DOM.fDatarLp) DOM.fDatarLp.innerHTML = lpText;
    if (DOM.fDatarV)  DOM.fDatarV.innerHTML  = vText;
    const elLa = document.getElementById('datar-la-result'), elLp = document.getElementById('datar-lp-result'), elV = document.getElementById('datar-vol-result');
    if (elLa) elLa.innerText = la.toFixed(2); if (elLp) elLp.innerText = lp.toFixed(2); if (elV) elV.innerText = v.toFixed(2);
}

function updateSceneDatar(shape) {
    while (datarGroup.children.length > 0) datarGroup.remove(datarGroup.children[0]);

    const dims = getDatarDims(shape);
    const p_net  = DOM.netDatarSlider  ? parseFloat(DOM.netDatarSlider.value)  / 100 : 0;
    const p_luas = DOM.luasDatarSlider ? parseFloat(DOM.luasDatarSlider.value) / 100 : 0;
    const p_vol  = DOM.volDatarSlider  ? parseFloat(DOM.volDatarSlider.value)  / 100 : 0;
    const baseColorHex = DATAR_COLORS[shape];
    updateDatarAnimationControls(shape);

    // sinkron tampilan nilai dimensi
    if (shape === 'kubus' && DOM.sVal) DOM.sVal.innerText = dims.W;
    if (shape === 'balok') {
        if (DOM.pVal) DOM.pVal.innerText = dims.W;
        if (DOM.lVal) DOM.lVal.innerText = dims.D;
        if (DOM.tbVal) DOM.tbVal.innerText = dims.H;
    }
    if ((shape === 'prisma' || shape === 'limas')) {
        if (DOM.aVal) DOM.aVal.innerText = dims.a;
        if (DOM.tplVal) DOM.tplVal.innerText = dims.t;
    }
    if (DOM.netDatarVal)  DOM.netDatarVal.innerText  = Math.round(p_net*100);
    if (DOM.luasDatarVal) DOM.luasDatarVal.innerText = Math.round(p_luas*100);
    if (DOM.volDatarVal)  DOM.volDatarVal.innerText  = Math.round(p_vol*100);

    const isBoxShape = (shape === 'kubus' || shape === 'balok');
    const anyDiagOn = diagBidangOn || diagRuangOn || diagBDiagonalOn;
    const anyAnimOn = p_net > 0 || p_luas > 0 || p_vol > 0;

    // ---- kunci n-stepper saat mode net/kaca aktif dianggap aman diubah kapan saja (rebuild total),
    //      tapi lebih baik dikunci saat jaring-jaring sedang terbuka biar tidak membingungkan ----
    if (DOM.nMinus) DOM.nMinus.disabled = p_net > 0;
    if (DOM.nPlus)  DOM.nPlus.disabled  = p_net > 0;

    // ---- hint & locking mode kaca ----
    if (DOM.hintDiagonal) DOM.hintDiagonal.style.display = (isBoxShape && !isTrans) ? 'block' : 'none';
    if (DOM.hintAnimDatar) DOM.hintAnimDatar.style.display = !isTrans ? 'block' : 'none';

    [DOM.btnDiagBidang, DOM.btnDiagRuang, DOM.btnDiagBDiag].forEach(btn => {
        if (!btn) return;
        btn.disabled = !isTrans || anyAnimOn;
    });

    const netActive = p_net > 0;
    const luasActive = p_luas > 0;
    const volActive = p_vol > 0;
    const setSliderLocked = (sl, locked) => {
        if (!sl) return;
        sl.disabled = locked;
        sl.style.opacity = locked ? '0.4' : '1';
        sl.style.cursor = locked ? 'not-allowed' : 'pointer';
    };
    setSliderLocked(DOM.netDatarSlider, anyDiagOn || luasActive || volActive);
    setSliderLocked(DOM.luasDatarSlider, anyDiagOn || netActive || volActive || !isTrans);
    setSliderLocked(DOM.volDatarSlider, anyDiagOn || netActive || luasActive || !isTrans);

    const accDatarHeader = DOM.brsdAnimationNav ? DOM.brsdAnimationNav.querySelector('.accordion-header') : null;
    if (accDatarHeader) accDatarHeader.classList.toggle('locked', netActive || anyDiagOn);

    if (anyAnimOn) { diagBidangOn = false; diagRuangOn = false; diagBDiagonalOn = false; updateDiagonalButtonUI(); }

    // ---- render bangun ----
    let boxCorners = null;
    if (shape === 'kubus' || shape === 'balok') {
        boxCorners = buildBoxDatar(dims.W, dims.D, dims.H, p_net, p_luas, baseColorHex);
        if (p_net === 0) addBoxDiagonals(boxCorners, dims.W, dims.D, dims.H);
    } else if (shape === 'prisma') {
        buildPrismaDatar(dims.n, dims.a, dims.t, p_net, p_luas, baseColorHex);
    } else if (shape === 'limas') {
        buildLimasDatar(dims.n, dims.a, dims.t, p_net, p_luas, baseColorHex);
    }

    const renderVolumeFill = () => {
        const mats = makeWaterMats(COLOR_VOL_ANIM);
        if (shape === 'kubus' || shape === 'balok') {
            fillBox(0, -dims.H/2, 0, dims.W, dims.D, p_vol*dims.H, dims.H, mats);
        } else if (shape === 'prisma') {
            const info = polygonGeomInfo(dims.n, dims.a);
            fillPrismVol(0, -dims.t/2, 0, info.pts, p_vol*dims.t, dims.t, mats);
        } else if (shape === 'limas') {
            const info = polygonGeomInfo(dims.n, dims.a);
            fillLimasVol(0, -dims.t/2, 0, info.pts, dims.t, p_vol, mats);
        }
    };

    // ---- animasi volume (isi air), hanya saat bangun tertutup (p_net = 0) ----
    if (p_vol > 0 && p_net === 0 && p_vol < 0.999) renderVolumeFill();

    // ---- label dimensi (r,t,s,p,l,a) hanya saat kaca aktif & tidak sedang animasi ----
    if (p_net === 0 && p_luas === 0 && p_vol === 0) {
        addDatarDimLabel(shape, dims);
    }

    if (p_vol >= 0.999 && p_net === 0) renderVolumeFill();

    updateMathDatar(shape, dims);
}

updateScene();
function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
animate();
