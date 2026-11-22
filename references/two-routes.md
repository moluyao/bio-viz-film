# 两条出片路线：快速路线（WebGL）与专业路线（Blender Cycles）

同一个场景、同一份故事脚本、同一套网页版式，可以走两条路线出片。

| | 快速路线 | 专业路线 |
|---|---|---|
| 渲染 | three.js 光栅 + N8AO 环境光遮蔽 + 景深 + 辉光 | Blender Cycles 路径追踪（真实全局光照、软阴影），OIDN 降噪 |
| 速度（1080×1350，本机 Intel Arc） | 49 秒片子约 15 分钟（60fps，2 倍超采样） | 优化后约 9.5 秒/帧（16 spp + OIDN），49 秒片子（24fps，1176 帧）约 3 小时 |
| 适合 | 迭代、预览、日常出片 | 最终发布版、海报、封面 |

## 共用的质量工具（两条路线都用）
1. **真实蛋白结构 → 珠串模型**：`tools/pdb2beads.py <PDB_ID> site2/mol/<ID>.json [--opm] [--group 链,链]`
   - 从 RCSB 下载 mmCIF；`--opm` 改用 OPM 数据库已定向的膜蛋白（膜法线 = z，并给出膜厚度）。
   - 把重原子按 0.6 nm（精细）/ 1.4 nm（粗略）体素聚成珠子；类别：蛋白 / 叶绿素等色素 / 类胡萝卜素 / 金属簇。
   - 输出关键位点坐标（Mn 簇、醌位点、血红素、Fe-S 簇），过程动画就从这些真实位点出发。
   - `--group` 标记一组链（例如 ATP 合酶转子 c 环 + γ + ε），在动画里可以单独转动。
   - **定向自检**：同一坐标系下，PSII 的 Mn 簇、PSI 的 Fe-S、ATP 合酶头部、cyt f 必须指向一致的腔 / 基质侧，否则说明定向错了。
2. **珠串风格渲染**：`beadGeo()` 把珠子合成一个几何体（顶点色按类别），复合体用 InstancedMesh 摆放；离得近的用精细模型，其余用粗略模型；珠子用平滑法线。
3. **穿模检测**：`node tools/check.mjs site2 "story=..."` 调用场景的 `check()`，逐珠检查不同分子之间有没有重叠，按分子种类汇总。摆放时用珠子级碰撞网格（`bgHit / bgAdd`），保证 0 重叠。
4. **N8AO 环境光遮蔽**：story 写 `ao: { r: 0.012, i: 2.6 }`，半径随相机距离自动缩放。注意要关掉 N8AO 自带的 gamma 校正，否则画面会发白。

## 专业路线步骤
```
node tools/export_blender.mjs site2 "story=thylakoid-en" out/blender/thylakoid --fps 24
blender -b --factory-startup --python tools/blender_build.py -- out/blender/thylakoid out/blender/frames --samples 24 --view Standard
node tools/record.mjs site2 --size 1080x1350 --dpr 1 --fps 24 --query "story=thylakoid-en&uionly=1" --overlay-dir out/blender/ui
ffmpeg -framerate 24 -i out/blender/frames/%05d.png -framerate 24 -i out/blender/ui/%05d.png -filter_complex overlay -c:v libx264 -crf 16 -pix_fmt yuv420p out/x_pro.mp4
```
- **导出**：静态网格存成 glb，实例化网格只存原型和矩阵；分子存"哪个 PDB、哪一档精度、哪些矩阵"；每一帧存相机（位置、四元数、视场角、视口偏移）、对焦距离、剖切高度、动态分子池和动态分子的矩阵。
- **Blender 重建**：
  - 实例化网格用几何节点（Instance on Points）重建。
  - 分子先把珠子"点"实例化再实化，删掉剖切面以上的点，再放球。不要在 Cycles 里嵌套"隐藏原型"，否则珠子会消失。
  - 剖切：几何节点先删掉切面以上的几何，跨切面的那部分用材质处理：切面以上透明，背面画成截面色。只靠透明的话，层数一多会超过透明反弹上限，出现大块黑斑。
  - 相机：three.js 的视口偏移对应 Blender 的 shift_y，取负号，单位是长边。
  - Blender 5.x 不能用 `mod[socket]` 给几何节点修改器传值，改成直接改节点组里 Value 节点的值。
- **网页叠加**：`?uionly=1` 让网页只渲染界面层（3D 窗口处透明），再用 ffmpeg 叠到 Blender 帧上。两边相机由同一份 story 计算，所以标注准星和 3D 结构是对齐的。

## 提速经验（实测）
- 先用 `--samples 1` 测一下单帧时间：如果 1 个采样也要十几秒，瓶颈就不在采样，而在场景同步或 BVH 重建。
- 珠子不要用"实例化小球"（几百万个实例，每帧都要重建顶层 BVH），改用 Cycles 原生点云（Mesh to Points + radius），真球体、构建快。
- 不要每帧都写 scene 的自定义属性（例如 `sc['cut']`），会让整个场景的几何节点重新求值；值没变就跳过。
- 16 spp + OIDN 和 24 spp 肉眼看不出区别；省下的主要是采样时间。
- 脚本支持断点续渲（跳过已存在的帧），关键帧会排在最前面先渲，方便提前检查画质。
- **最关键的两条**：① 只用 GPU 渲染，不要让 CPU 一起渲（笔记本上 CPU 和核显共用一个功耗额度，CPU 跑满会拖慢 GPU）；② 降噪放到 GPU 上（`denoising_use_gpu`），默认在 CPU 上降噪每帧要 3 秒。两条做完：17 秒/帧 → 4 秒/帧，整片约 1.3 小时。
- 测过但没用的办法：整段动画模式渲染（约 10 秒/帧）、EEVEE（约 7 秒/帧）、把静态几何"烘焙"成固定几何（约 10 秒/帧）。剩下的约 5 秒/帧是 Cycles 自身每帧的固定开销，加上核显本身的速度，在这台机器上就是上限。
- 真正能大幅提速的只有这几种：独立显卡（RTX 级，快 5–10 倍）；只用 Cycles 渲关键特写镜头，其余镜头用快速路线；12fps 渲染再用 AI 补帧（RIFE）补到 24fps，时间减半，但要检查补帧瑕疵。
- **NPU（Intel AI Boost）实测**：通过 OpenVINO 能用，但只能跑神经网络，跑不了 Cycles 路径追踪。用 RIFE 4.25 lite 做补帧（每渲 2 帧补中间 1 帧），NPU 上约 2.6 秒/帧（第一次编译约 200 秒），但在剖面镜头里画面明显糊、出拖影（PSNR 22 dB，还不如两帧直接叠化的 24.5 dB），不采用。测试脚本：`tools/npu_rife_test.py`。
