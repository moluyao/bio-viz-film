# Blender (Cycles) build + render for a bio-viz-film scene exported by tools/export_blender.mjs.
#   blender -b --factory-startup --python tools/blender_build.py -- <exportDir> <outFramesDir> [--frames 0:1176:1] [--samples 32] [--scale 100] [--save scene.blend]
# Rebuilds: static meshes (glTF), instanced meshes (GN Instance on Points), real-protein bead models (nested GN instances),
# dynamic molecules (per-frame handler), camera (per-frame keys incl. view shift and focus), the section cut (shader: transparent above the cut,
# back faces seen through the cut are rendered as flat "section caps", like the WebGL capify).
import bpy, json, math, sys, os, mathutils
from mathutils import Matrix, Vector, Quaternion

argv = sys.argv[sys.argv.index('--') + 1:]
D, OUT = os.path.abspath(argv[0]), os.path.abspath(argv[1])
def opt(k, d):
    return argv[argv.index(k) + 1] if k in argv else d
F0, F1, FS = [int(x) for x in opt('--frames', '0:-1:1').split(':')]
SAMPLES, SCALE = int(opt('--samples', 32)), int(opt('--scale', 100))
meta = json.load(open(os.path.join(D, 'scene.json')))
frames = [json.loads(l) for l in open(os.path.join(D, 'frames.jsonl'))]
if F1 < 0: F1 = len(frames)
PAL = meta['palette']

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
def hexcol(h, a=1.0):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [a]

# ---------- materials: principled + cut (transparent above scene["cut"]) + section caps on back faces ----------
sc['cut'] = 1e6
def cut_material(name, color=None, attr=None, emission=0.0, rough=0.5, nocut=False, matte=False, attr_type='INSTANCER'):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links; N.clear()
    out = N.new('ShaderNodeOutputMaterial'); bsdf = N.new('ShaderNodeBsdfPrincipled'); bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Coat Weight'].default_value = 0.0 if matte else 0.25; bsdf.inputs['Sheen Weight'].default_value = 0.2
    if matte: bsdf.inputs['Specular IOR Level'].default_value = 0.15
    if attr:
        a = N.new('ShaderNodeAttribute'); a.attribute_type = attr_type; a.attribute_name = attr; base = a.outputs['Color']
    else:
        rgb = N.new('ShaderNodeRGB'); rgb.outputs[0].default_value = color; base = rgb.outputs[0]
    L.new(base, bsdf.inputs['Base Color'])
    if emission > 0: L.new(base, bsdf.inputs['Emission Color']); bsdf.inputs['Emission Strength'].default_value = emission
    geo = N.new('ShaderNodeNewGeometry'); cap = N.new('ShaderNodeBsdfDiffuse'); dark = N.new('ShaderNodeMix'); dark.data_type = 'RGBA'; dark.inputs['Factor'].default_value = 0.38
    L.new(base, dark.inputs['A']); dark.inputs['B'].default_value = (0, 0, 0, 1); L.new(dark.outputs['Result'], cap.inputs['Color'])
    mixc = N.new('ShaderNodeMixShader'); L.new(geo.outputs['Backfacing'], mixc.inputs['Fac']); L.new(bsdf.outputs[0], mixc.inputs[1]); L.new(cap.outputs[0], mixc.inputs[2])
    cutv = N.new('ShaderNodeAttribute'); cutv.attribute_type = 'VIEW_LAYER'; cutv.attribute_name = 'cut'
    sep = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Position'], sep.inputs[0])
    gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; L.new(sep.outputs['Z'], gt.inputs[0]); L.new(cutv.outputs['Fac'], gt.inputs[1])
    tr = N.new('ShaderNodeBsdfTransparent'); mix = N.new('ShaderNodeMixShader'); L.new(gt.outputs[0], mix.inputs['Fac']); L.new(mixc.outputs[0], mix.inputs[1]); L.new(tr.outputs[0], mix.inputs[2])
    L.new(mixc.outputs[0] if nocut else mix.outputs[0], out.inputs['Surface']); return m

CULL = []
def add_cull(obj, domain='FACE', margin=1.0, realize=False):
    mod = obj.modifiers.new('cull', 'NODES'); ng = bpy.data.node_groups.new(obj.name + '_cull', 'GeometryNodeTree'); mod.node_group = ng
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); cv = ng.nodes.new('ShaderNodeValue'); cv.name = 'CutVal'; cv.outputs[0].default_value = 1e6
    ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    N = ng.nodes; L = ng.links; gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput'); src = gi.outputs[0]
    if realize: rz = N.new('GeometryNodeRealizeInstances'); L.new(src, rz.inputs[0]); src = rz.outputs[0]
    pos = N.new('GeometryNodeInputPosition'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(pos.outputs[0], sep.inputs[0])
    add = N.new('ShaderNodeMath'); add.operation = 'ADD'; L.new(cv.outputs[0], add.inputs[0]); add.inputs[1].default_value = margin
    gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; L.new(sep.outputs['Z'], gt.inputs[0]); L.new(add.outputs[0], gt.inputs[1])
    dl = N.new('GeometryNodeDeleteGeometry'); dl.domain = domain; L.new(src, dl.inputs['Geometry']); L.new(gt.outputs[0], dl.inputs['Selection'])
    L.new(dl.outputs[0], go.inputs[0]); CULL.append((obj, mod, cv)); return mod

# ---------- static glTF ----------
bpy.ops.import_scene.gltf(filepath=os.path.join(D, 'static.glb'))
R = Matrix.Rotation(-math.pi / 2, 4, 'X')   # undo the importer's Y-up → Z-up conversion: back to the exporter's world frame (z up)
imported = [o for o in sc.objects if o.type == 'MESH']
for o in imported:
    o.matrix_world = R @ o.matrix_world
bpy.ops.object.select_all(action='DESELECT')
for o in imported: o.select_set(True)
bpy.context.view_layer.objects.active = imported[0]; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
mats = {}
for o in imported:
    for i, s in enumerate(o.material_slots):
        nm = s.material.name if s.material else 'bv_ffffff'; hx = nm.split('bv_')[-1][:6]
        if hx not in mats: mats[hx] = cut_material('M_' + hx, hexcol(hx), rough=0.85, matte=True)
        o.material_slots[i].material = mats[hx]
for e in [o for o in sc.objects if o.type == 'EMPTY']: bpy.data.objects.remove(e)
for o in imported:
    if o.name.startswith('static_'): add_cull(o, margin=2.0)

# ---------- GN helpers ----------
def gn_instance(obj, proto=None, sphere=False, subdiv=1, use_rot=True, use_scale=False, radius_attr=None, mat=None):
    mod = obj.modifiers.new('inst', 'NODES'); ng = bpy.data.node_groups.new(obj.name + '_gn', 'GeometryNodeTree'); mod.node_group = ng
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    N = ng.nodes; L = ng.links; gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput'); iop = N.new('GeometryNodeInstanceOnPoints')
    L.new(gi.outputs[0], iop.inputs['Points'])
    if sphere:
        ico = N.new('GeometryNodeMeshIcoSphere'); ico.inputs['Radius'].default_value = 1.0; ico.inputs['Subdivisions'].default_value = subdiv
        sm = N.new('GeometryNodeSetShadeSmooth'); L.new(ico.outputs['Mesh'], sm.inputs['Geometry'])
        if mat: sms = N.new('GeometryNodeSetMaterial'); sms.inputs['Material'].default_value = mat; L.new(sm.outputs[0], sms.inputs['Geometry']); L.new(sms.outputs[0], iop.inputs['Instance'])
        else: L.new(sm.outputs[0], iop.inputs['Instance'])
    else:
        oi = N.new('GeometryNodeObjectInfo'); oi.inputs['Object'].default_value = proto; oi.inputs['As Instance'].default_value = True; L.new(oi.outputs['Geometry'], iop.inputs['Instance'])
    if use_rot:
        ra = N.new('GeometryNodeInputNamedAttribute'); ra.data_type = 'FLOAT_VECTOR'; ra.inputs['Name'].default_value = 'rot'; L.new(ra.outputs['Attribute'], iop.inputs['Rotation'])
    if use_scale:
        sa = N.new('GeometryNodeInputNamedAttribute'); sa.data_type = 'FLOAT_VECTOR'; sa.inputs['Name'].default_value = 'scl'; L.new(sa.outputs['Attribute'], iop.inputs['Scale'])
    if radius_attr:
        rd = N.new('GeometryNodeInputNamedAttribute'); rd.data_type = 'FLOAT'; rd.inputs['Name'].default_value = radius_attr; L.new(rd.outputs['Attribute'], iop.inputs['Scale'])
    L.new(iop.outputs['Instances'], go.inputs[0]); return mod

def points_obj(name, pts, attrs):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(p) for p in pts], [], []);
    for an, (typ, vals) in attrs.items():
        a = me.attributes.new(an, typ, 'POINT'); key = 'vector' if typ == 'FLOAT_VECTOR' else 'color' if typ == 'FLOAT_COLOR' else 'value'
        flat = [x for v in vals for x in (v if isinstance(v, (list, tuple)) else [v])]; a.data.foreach_set(key, flat)
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); return o

def decompose(e):  # three.js column-major 16 → loc, euler, scale
    m = Matrix([[e[0], e[4], e[8], e[12]], [e[1], e[5], e[9], e[13]], [e[2], e[6], e[10], e[14]], [0, 0, 0, 1]])
    l, q, s = m.decompose(); return l, q.to_euler('XYZ'), s

hidden = bpy.data.collections.new('prototypes'); sc.collection.children.link(hidden); hidden.hide_render = False
def hide_proto(o, park=False):
    for c in o.users_collection: c.objects.unlink(o)
    hidden.objects.link(o)
    if park: o.location = (0, 0, 5e6)          # nested-instance prototypes must stay render-visible: park them far away instead
    else: o.hide_render = True; o.hide_viewport = True

# instanced static meshes (discs, lamellae, Rubisco blobs, ribosomes, plastoglobuli...)
for it in meta['inst']:
    proto = bpy.data.objects.get(it['name'])
    if not proto: print('missing proto', it['name']); continue
    L_, E_, S_ = zip(*[decompose(m) for m in it['matrices']])
    po = points_obj('I_' + it['name'], L_, {'rot': ('FLOAT_VECTOR', [tuple(e) for e in E_]), 'scl': ('FLOAT_VECTOR', [tuple(s) for s in S_])})
    gn_instance(po, proto=proto, use_scale=True); add_cull(po, realize=True, margin=2.0); hide_proto(proto)

# ---------- bead models (real structures) ----------
MOLDIR = opt('--mol', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site2', 'mol'))
bead_mat = cut_material('M_beads', attr='bcol', rough=0.45, nocut=True, attr_type='GEOMETRY')
CLS = {1: 'chl', 2: 'car', 5: 'metal'}
protos = {}
def bead_proto(mol, lod, grp=None, ckey=None):
    k = (mol, lod, grp, ckey)
    if k in protos: return protos[k]
    d = json.load(open(os.path.join(MOLDIR, mol + '.json'))); bl = d['fine' if lod == 'f' else 'coarse']
    if grp is not None: bl = [b for b in bl if (len(b) > 5 and int(b[5]) == grp)]
    base = ckey or meta['complexColor'][mol]
    cols = [hexcol(PAL[CLS.get(int(b[4]), base)]) for b in bl]
    o = points_obj(f'B_{mol}_{lod}_{grp}_{ckey}', [b[:3] for b in bl], {'radius': ('FLOAT', [b[3] for b in bl]), 'bcol': ('FLOAT_COLOR', cols)}); o['subdiv'] = 1 if lod == 'c' else 2
    protos[k] = o; return o
def bead_spheres(po, subdiv):   # realize the bead points, cull above the cut, then render them as Cycles point-cloud spheres (no per-bead instances → fast BVH)
    add_cull(po, domain='POINT', margin=0.0, realize=True)
    mod = po.modifiers.new('pts', 'NODES'); ng = bpy.data.node_groups.new(po.name + '_pts', 'GeometryNodeTree'); mod.node_group = ng
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    N = ng.nodes; L = ng.links; gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput'); mp = N.new('GeometryNodeMeshToPoints')
    rd = N.new('GeometryNodeInputNamedAttribute'); rd.data_type = 'FLOAT'; rd.inputs['Name'].default_value = 'radius'
    L.new(gi.outputs[0], mp.inputs['Mesh']); L.new(rd.outputs['Attribute'], mp.inputs['Radius'])
    sm = N.new('GeometryNodeSetMaterial'); sm.inputs['Material'].default_value = bead_mat; L.new(mp.outputs[0], sm.inputs['Geometry']); L.new(sm.outputs[0], go.inputs[0])
for g in meta['beads']:
    ck = 'rotor' if g.get('grp') == 1 else g.get('color')
    pr = bead_proto(g['mol'], g['lod'], g.get('grp'), ck)
    L_, E_, S_ = zip(*[decompose(m) for m in g['matrices']])
    po = points_obj(f"P_{g['mol']}_{g['lod']}_{g.get('grp')}", L_, {'rot': ('FLOAT_VECTOR', [tuple(e) for e in E_])})
    gn_instance(po, proto=pr); bead_spheres(po, pr['subdiv'])
for pr in list(protos.values()): hide_proto(pr)
dyn_objs = {}
for d in meta['dyn']:
    pr = bead_proto(d['mol'], d['lod'], d.get('grp'), 'rotor' if d.get('grp') == 1 else d.get('color'))
    po = points_obj('DYN_' + d['dyn'], [(0, 0, 0)], {'rot': ('FLOAT_VECTOR', [(0, 0, 0)])}); gn_instance(po, proto=pr); bead_spheres(po, pr['subdiv']); dyn_objs[d['dyn']] = po; hide_proto(pr)

# ---------- dynamic pools (electrons, H+, photons, O2, ATP ...) ----------
pool_objs = {}
for p in meta['pools']:
    m = cut_material('M_pool_' + p['kind'], hexcol(p['color']), emission=6.0 * p['emissive'] if p['emissive'] else 0.0, rough=0.3, nocut=True)
    po = points_obj('POOL_' + p['kind'], [], {}); po.data.attributes.new('rot', 'FLOAT_VECTOR', 'POINT'); po.data.attributes.new('scl', 'FLOAT_VECTOR', 'POINT')
    gn_instance(po, sphere=True, subdiv=2, use_scale=True, mat=m); pool_objs[p['kind']] = po

def set_points(o, mats):
    me = o.data; me.clear_geometry()
    if not mats: return
    LES = [decompose(m) for m in mats]; me.vertices.add(len(LES)); me.vertices.foreach_set('co', [c for l, _, _ in LES for c in l])
    for an, vals in (('rot', [c for _, e, _ in LES for c in e]), ('scl', [c for _, _, s in LES for c in s])):
        a = me.attributes.get(an) or me.attributes.new(an, 'FLOAT_VECTOR', 'POINT'); a.data.foreach_set('vector', vals)
    me.update()

# ---------- camera, lights, world ----------
cam = bpy.data.cameras.new('cam'); co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
cam.sensor_fit = 'VERTICAL'; cam.dof.use_dof = True; cam.dof.aperture_fstop = float(opt('--fstop', 8))
W, H = meta['size']; sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, H, SCALE
def apply_frame(f):
    fr = frames[min(f, len(frames) - 1)]; c = fr['cam']
    co.location = c['p']; q = c['q']; co.rotation_mode = 'QUATERNION'; co.rotation_quaternion = Quaternion((q[3], q[0], q[1], q[2]))
    cam.angle_y = math.radians(c['fov']); cam.shift_y = -c['offY'] * H / max(W, H)
    cam.shift_x = c['offX'] * (W / max(W, H)); cam.clip_start = max(0.01, c['near'] * 0.5); cam.clip_end = c['far'] * 2; cam.dof.focus_distance = fr['fd']
    if abs(sc.get('cut', 1e6) - fr['cut']) > 1e-3: sc['cut'] = fr['cut']
    for o, mod, cvn in CULL:
        if abs(cvn.outputs[0].default_value - fr['cut']) > 1e-3: cvn.outputs[0].default_value = fr['cut']
    d = math.dist(c['p'], [0, 0, 0]) if False else max(1.0, fr['fd']); FILL[1].location = (0, 0, 0); FILL[0].size = d * 0.8; FILL[0].energy = 12 * d * d
    for k, o in pool_objs.items(): set_points(o, fr['pools'].get(k, []))
    for k, o in dyn_objs.items():
        if k in fr['dyn']: o.matrix_world = Matrix([[fr['dyn'][k][j * 4 + i] for j in range(4)] for i in range(4)])
def handler(scene, depsgraph=None):
    apply_frame(scene.frame_current)
bpy.app.handlers.frame_change_pre.append(handler)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = hexcol('dcd5f0'); bg.inputs[1].default_value = 1.15
def light(name, typ, rot, energy, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, typ); ld.energy = energy; ld.color = color
    if typ == 'SUN': ld.angle = math.radians(12)
    lo = bpy.data.objects.new(name, ld); lo.rotation_euler = rot; sc.collection.objects.link(lo)
light('key', 'SUN', (math.radians(35), math.radians(-25), math.radians(20)), 4.5, (1, 0.96, 0.9))
fl = bpy.data.lights.new('fill', 'AREA'); fl.energy = 0; fl.size = 4; flo = bpy.data.objects.new('fill', fl); flo.parent = co; sc.collection.objects.link(flo); FILL = (fl, flo)
light('rim', 'SUN', (math.radians(-60), math.radians(35), math.radians(-140)), 1.4, (0.65, 0.78, 1))

# ---------- render settings ----------
ENG = opt('--engine', 'CYCLES')
if ENG == 'EEVEE':
    for nm in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try: sc.render.engine = nm; break
        except Exception: pass
    ee = sc.eevee; ee.taa_render_samples = int(opt('--samples', 16))
    for k, v in (('use_raytracing', True), ('use_shadows', True), ('use_gtao', True), ('ray_tracing_method', 'SCREEN'), ('use_fast_gi', True)):
        try: setattr(ee, k, v)
        except Exception as e: print('eevee opt', k, e)
    for m in bpy.data.materials:
        try: m.surface_render_method = 'DITHERED'
        except Exception: pass
sc.render.engine = 'CYCLES' if ENG == 'CYCLES' else sc.render.engine; cy = sc.cycles
prefs = bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type = 'ONEAPI'; prefs.get_devices()
HYB = '--hybrid' in argv
for dv in prefs.devices: dv.use = (dv.type != 'CPU') or HYB   # GPU only by default: on laptops CPU+iGPU share one power budget
print('DEVICES', [(d.name, d.type, d.use) for d in prefs.devices])
cy.device = 'GPU'; cy.samples = SAMPLES; cy.use_adaptive_sampling = True; cy.use_denoising = '--nodenoise' not in argv; cy.denoiser = 'OPENIMAGEDENOISE'
for k, v in (('denoising_use_gpu', True), ('denoising_quality', opt('--dq', 'HIGH')), ('denoising_prefilter', opt('--dpf', 'ACCURATE'))):
    try: setattr(cy, k, v)
    except Exception as e: print('denoise opt', k, e)
print('DENOISE', getattr(cy, 'denoising_use_gpu', None), getattr(cy, 'denoising_quality', None), getattr(cy, 'denoising_prefilter', None))
cy.max_bounces = 6; cy.diffuse_bounces = 3; cy.glossy_bounces = 2; cy.transparent_max_bounces = 32; cy.transmission_bounces = 2
sc.view_settings.view_transform = opt('--view', 'Standard'); sc.view_settings.exposure = float(opt('--exposure', -0.6)); sc.render.fps = meta['fps']
sc.render.use_persistent_data = True; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.compression = 10; sc.render.film_transparent = False
os.makedirs(OUT, exist_ok=True)
if '--save' in argv: bpy.ops.wm.save_as_mainfile(filepath=opt('--save', 'scene.blend'))
import time
if '--debug' in argv:
    dg = bpy.context.evaluated_depsgraph_get(); cnt = {}
    for inst in dg.object_instances:
        n = inst.parent.name if inst.parent else inst.object.name; cnt[n] = cnt.get(n, 0) + 1
    for k, v in sorted(cnt.items(), key=lambda kv: -kv[1])[:25]: print('INST', k, v)
    for o in sc.objects:
        if o.name.startswith('P_') or o.name.startswith('B_'): print('OBJ', o.name, len(o.data.vertices), o.hide_render, [m.type for m in o.modifiers])
    sys.exit(0)
if '--bake' in argv:   # freeze all static geometry-node results once (valid while the cut stays fixed) → per frame only pools/dyn/camera change
    apply_frame(FL0 := int(opt('--bake', '200'))); bpy.context.view_layer.update()
    dyn_names = {o.name for o in pool_objs.values()} | {o.name for o in dyn_objs.values()}
    for o in list(sc.objects):
        if o.type != 'MESH' or not o.modifiers or o.name in dyn_names or o.hide_render: continue
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        has_pts = any(m.name == 'pts' for m in o.modifiers)
        try: bpy.ops.object.convert(target='POINTCLOUD' if has_pts else 'MESH')
        except Exception as e: print('convert failed', o.name, e)
    CULL[:] = [c for c in CULL if c[0].name in dyn_names]
    print('BAKED', len(sc.objects))
if '--anim' in argv:   # whole-animation render (keeps Cycles persistent data warm between frames)
    a0, a1 = [int(x) for x in opt('--anim', '0:10').split(':')]; sc.frame_start, sc.frame_end = a0, a1 - 1; sc.render.filepath = os.path.join(OUT, '#####')
    import time; TT = [time.time()]
    def post(scene, *a):
        TT.append(time.time()); print(f'FRAME {scene.frame_current} {TT[-1] - TT[-2]:.1f}s', flush=True)
    bpy.app.handlers.render_post.append(post); bpy.ops.render.render(animation=True); sys.exit(0)
FL = [int(x) for x in opt('--list', '').split(',') if x] or list(range(F0, F1, FS))
KEY = [k for k in (72, 240, 492, 600, 816, 960, 1110) if k in FL]; FL = KEY + [f for f in FL if f not in KEY]   # key frames first, so a quality check is possible early
FL = [f for f in FL if not os.path.exists(os.path.join(OUT, f'{f:05d}.png'))]   # resume
for f in FL:
    t0 = time.time(); sc.frame_set(f); t1 = time.time(); sc.render.filepath = os.path.join(OUT, f'{f:05d}.png'); bpy.ops.render.render(write_still='--nowrite' not in argv)
    print(f'FRAME {f} {time.time() - t0:.1f}s (set {t1 - t0:.1f}s)', flush=True)
