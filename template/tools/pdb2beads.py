# PDB/mmCIF → coarse bead model (Goodsell-style) for bio-viz-film.
# Usage: python tools/pdb2beads.py <PDB_ID> <out.json> [--grid 0.6] [--lod 1.4]
# Downloads https://files.rcsb.org/download/<ID>.cif (cached in tools/pdb_cache/), keeps heavy atoms of the first model,
# clusters them on a voxel grid (nm), and writes beads [x,y,z,r,cls] in nm, centred on the complex centroid.
# cls: 0 protein, 1 chlorophyll/pigment ring, 2 carotenoid, 3 lipid/other ligand, 4 nucleic acid, 5 metal/cofactor cluster.
# Two LODs: fine (--grid) for close-ups, coarse (--lod) for wide shots. Real shape = real structure.
import sys, os, json, urllib.request, numpy as np
PIG = {'CLA', 'CHL', 'CL0', 'PHO', 'BCL', 'BPH', 'HEM', 'HEC'}
CAR = {'BCR', 'LUT', 'NEX', 'XAT', 'VIO', 'ZEA', 'CRT'}
MET = {'OEX', 'SF4', 'FES', 'MN', 'CA', 'FE', 'FE2', 'MG', 'ZN', 'CU', 'PL9', 'PQN', 'HEM'}
NUC = {'A', 'C', 'G', 'U', 'DA', 'DC', 'DG', 'DT'}
AA = set('ALA ARG ASN ASP CYS GLN GLU GLY HIS ILE LEU LYS MET PHE PRO SER THR TRP TYR VAL MSE SEC'.split())

def fetch(pid):
    d = os.path.join(os.path.dirname(__file__), 'pdb_cache'); os.makedirs(d, exist_ok=True)
    f = os.path.join(d, pid.upper() + '.cif')
    if not os.path.exists(f): urllib.request.urlretrieve(f'https://files.rcsb.org/download/{pid.upper()}.cif', f)
    return f

def atoms(path):
    cols, rows, inloop = [], [], False
    with open(path, encoding='utf-8', errors='ignore') as fh:
        for ln in fh:
            if ln.startswith('_atom_site.'): cols.append(ln.split('.', 1)[1].strip()); inloop = True; continue
            if inloop and (ln.startswith('ATOM') or ln.startswith('HETATM')): rows.append(ln.split()); continue
            if inloop and rows and (ln.startswith('#') or ln.startswith('loop_')): break
    ix = {c: i for i, c in enumerate(cols)}
    out = []
    for r in rows:
        if r[ix['type_symbol']] in ('H', 'D'): continue
        if 'pdbx_PDB_model_num' in ix and r[ix['pdbx_PDB_model_num']] != '1': continue
        res = r[ix['label_comp_id']]; ch = r[ix.get('auth_asym_id', ix['label_asym_id'])]
        cls = 0 if res in AA else 1 if res in PIG else 2 if res in CAR else 4 if res in NUC else 5 if res in MET else 3
        if res == 'HOH': continue
        out.append((float(r[ix['Cartn_x']]), float(r[ix['Cartn_y']]), float(r[ix['Cartn_z']]), cls, ch))
    return out

GROUP = set()
def beads(A, grid):
    P = np.array([[a[0], a[1], a[2]] for a in A]) / 10.0  # Å → nm
    C = np.array([a[3] for a in A]); key = np.floor(P / grid).astype(np.int64)
    G = np.array([1 if len(a) > 4 and a[4] in GROUP else 0 for a in A])
    d = {}
    for k, p, c, g in zip(map(tuple, key), P, C, G):
        e = d.setdefault(k, [np.zeros(3), 0, np.zeros(6), 0]); e[0] += p; e[1] += 1; e[2][c] += 1; e[3] += g
    out = []
    for k, (s, n, cc, gg) in d.items():
        cls = int(np.argmax(cc));
        if cc[1] + cc[2] > 0 and cc[1] + cc[2] >= 0.3 * n: cls = 1 if cc[1] >= cc[2] else 2  # pigments win when present
        r = grid * (0.55 + 0.25 * min(1.0, n / (8 * (grid / 0.6) ** 3)))
        out.append([*(s / n), r, cls, 1 if gg * 2 > n else 0])
    return np.array(out)

def fetch_opm(pid):
    d = os.path.join(os.path.dirname(__file__), 'pdb_cache'); os.makedirs(d, exist_ok=True)
    f = os.path.join(d, pid.lower() + '_opm.pdb')
    if not os.path.exists(f): urllib.request.urlretrieve(f'https://opm-assets.storage.googleapis.com/pdb/{pid.lower()}.pdb', f)
    return f

def atoms_opm(path):  # OPM: membrane normal = z, hydrocarbon core between the DUM planes
    out, dum = [], []
    for ln in open(path, encoding='utf-8', errors='ignore'):
        if not (ln.startswith('ATOM') or ln.startswith('HETATM')): continue
        res = ln[17:20].strip(); x, y, z = float(ln[30:38]), float(ln[38:46]), float(ln[46:54])
        if res == 'DUM': dum.append(z); continue
        el = ln[76:78].strip() or ln[12:16].strip()[0]
        if el in ('H', 'D') or res == 'HOH': continue
        cls = 0 if res in AA else 1 if res in PIG else 2 if res in CAR else 4 if res in NUC else 5 if res in MET else 3
        out.append((x, y, z, cls, ln[21], res, ln[21] + ln[22:26]))
    return out, (max(abs(min(dum)), abs(max(dum))) / 10.0 if dum else None)

if __name__ == '__main__':
    if '--opm' in sys.argv:
        pid, outp = sys.argv[1], sys.argv[2]; g = 0.6; lod = 1.4
        if '--group' in sys.argv: GROUP.update(sys.argv[sys.argv.index('--group') + 1].split(','))
        A, half = atoms_opm(fetch_opm(pid)); P = np.array([a[:3] for a in A]) / 10
        mn = [a[2] / 10 for a in A if a[5] in ('OEX', 'MN')]; sf4 = [a[2] / 10 for a in A if a[5] == 'SF4']
        fine = beads(A, g); coarse = beads(A, lod); cxy = fine[:, :2].mean(0); fine[:, :2] -= cxy; coarse[:, :2] -= cxy
        sites = {}
        for nm in ('OEX', 'MN', 'SF4', 'HEC', 'HEM', 'PL9', 'FES', 'CLA'):
            byres = {}
            for a in A:
                if a[5] == nm: byres.setdefault(a[6], []).append(a[:3])
            if byres and nm != 'CLA': sites[nm] = [(np.array(v).mean(0) / 10 - [cxy[0], cxy[1], 0]).round(2).tolist() for v in byres.values()]
        info = {'sites': sites, 'mn_z': float(np.mean(mn)) if mn else None, 'sf4_z': float(np.mean(sf4)) if sf4 else None, 'mass_z': float(P[:, 2].mean())}
        ext = (fine[:, :3].max(0) - fine[:, :3].min(0)).round(2).tolist()
        json.dump({'id': pid.upper(), 'unit': 'nm', 'frame': 'OPM (membrane normal z, centre z=0)', 'membrane_half_nm': half, 'side_info': info, 'atoms': len(A), 'extent_nm': ext,
                   'fine': np.round(fine, 3).tolist(), 'coarse': np.round(coarse, 3).tolist()}, open(outp, 'w'))
        print(pid, 'group beads', int(fine[:, 5].sum()), 'atoms', len(A), 'fine', len(fine), 'half-thickness nm', half, info, 'z range', round(fine[:,2].min(),1), round(fine[:,2].max(),1))
        sys.exit()
    pid, outp = sys.argv[1], sys.argv[2]
    g = float(sys.argv[sys.argv.index('--grid') + 1]) if '--grid' in sys.argv else 0.6
    lod = float(sys.argv[sys.argv.index('--lod') + 1]) if '--lod' in sys.argv else 1.4
    A = atoms(fetch(pid)); fine = beads(A, g); c = fine[:, :3].mean(0); fine[:, :3] -= c
    coarse = beads(A, lod); coarse[:, :3] -= c
    ext = (fine[:, :3].max(0) - fine[:, :3].min(0)).round(2).tolist()
    json.dump({'id': pid.upper(), 'unit': 'nm', 'atoms': len(A), 'extent_nm': ext,
               'fine': np.round(fine, 3).tolist(), 'coarse': np.round(coarse, 3).tolist()}, open(outp, 'w'))
    print(pid, 'group beads', int(fine[:, 5].sum()), 'atoms', len(A), 'fine', len(fine), 'coarse', len(coarse), 'extent nm', ext,
          'classes', np.bincount(fine[:, 4].astype(int), minlength=6).tolist())
