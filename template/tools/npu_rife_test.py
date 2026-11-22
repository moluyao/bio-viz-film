# Benchmark: RIFE frame interpolation on the Intel NPU (OpenVINO) vs CPU, and accuracy against a real rendered middle frame.
#   python tools/npu_rife_test.py _models/rife425lite.onnx out/blender/thylakoid_frames 100 101 102 [devices]
import sys, time, numpy as np, openvino as ov
from PIL import Image
model, d, a, m, b = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:6])
devs = sys.argv[6].split(',') if len(sys.argv) > 6 else ['NPU', 'CPU']
ld = lambda f: np.asarray(Image.open(f'{d}/{f:05d}.png').convert('RGB'), dtype=np.float32) / 255
A, M, B = ld(a), ld(m), ld(b); H, W = A.shape[:2]; PH, PW = (H + 63) // 64 * 64, (W + 63) // 64 * 64
pad = lambda x: np.pad(x, ((0, PH - H), (0, PW - W), (0, 0)), mode='edge').transpose(2, 0, 1)[None]
core = ov.Core(); net = core.read_model(model)
net.reshape({'img0': [1, 3, PH, PW], 'img1': [1, 3, PH, PW], 'timestep': [1, 1, 1, 1]})
for dev in devs:
    try:
        t0 = time.time(); cm = core.compile_model(net, dev, {'INFERENCE_PRECISION_HINT': 'f16'} if dev != 'CPU' else {}); tc = time.time() - t0
        req = cm.create_infer_request(); feed = {'img0': pad(A), 'img1': pad(B), 'timestep': np.full((1, 1, 1, 1), 0.5, np.float32)}
        req.infer(feed); t0 = time.time(); n = 3
        for _ in range(n): req.infer(feed)
        dt = (time.time() - t0) / n; out = req.get_output_tensor(0).data[0].transpose(1, 2, 0)[:H, :W]
        psnr = lambda x, y: 10 * np.log10(1 / np.mean((x - y) ** 2))
        print(f'{dev}: compile {tc:.1f}s · {dt:.2f}s per frame · PSNR vs real middle frame {psnr(out, M):.1f} dB (cross-fade baseline {psnr((A + B) / 2, M):.1f} dB)')
        Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(f'out/blender/rife_{dev}_{m:05d}.png')
    except Exception as e:
        print(f'{dev}: FAILED {type(e).__name__}: {str(e)[:300]}')
