# 技法清单（模板里已经实现的，加上可以扩展的方向）

## 已实现

1. **种子随机**：用 `rng(seed)` 这个 mulberry32 随机数生成器，同一个 seed 永远生成同一个细胞。想换一种排布，改 `?seed=`。
2. **实例化渲染**：每类结构是一个 `InstancedMesh`，用 `inst(geo, cat, items)` 生成。items 是 `{p 位置, s 缩放, n 朝向法线 | q 四元数}`。细胞场景大约 9 万个实例，有几十个 draw call。
3. **剖切面**：着色器里判断 `dot(worldPos, uCutN) > uCut && length(worldPos) < uCutR`，满足就 discard，也就是只把细胞内部切掉，外面的伪足、刺突照常显示。把 `uCut` 从 12 降到 0.8，就是"掀盖子"的动画。所有材质都是 DoubleSide，被切开的球体能看到内壁，不会变成透明的洞。
4. **类别色槽和主题**：每个结构挂一个 `uCat`，共 16 个色槽。着色器在 `color_fragment` 之后乘上 `uPalA` 或 `uPalB` 里对应的颜色。实例自身只带 ±9% 的亮度抖动。换主题就是换一个 16 色数组。
5. **像素扫描换色**：在屏幕 x 坐标上，`x < uWipe` 的地方用新色板，否则用旧色板，场景只渲染一遍。后期着色器在扫描线两侧 ±0.1 的条带里按块马赛克化，部分块随机染成主题强调色，扫描线本身画一条白线。
6. **后期**：场景先渲染到 4× MSAA、HalfFloat 精度的 RT，再由后期着色器手动做 ACES 色调映射和 gamma，然后叠到径向渐变的浅色背景上。RT 是预乘 alpha，合成公式是 `bg*(1-a)+c`。注意不要让 three 自动做色调映射，否则白底会变灰。
7. **相机**：每个镜头从 A 推到 B（慢推），镜头之间用 1.7 秒的五次缓动（minimum-jerk）过渡。相机 up 轴固定为 +z。
8. **标注**：把锚点世界坐标投影到屏幕上，在那里画虚线准星，准星会转动和缩放出现；再用一条引线连到卡片；卡片里的文字按 24 字/秒逐字打出，带光标。
9. **仪表盘外壳**：顶栏数字、跑马灯、镜头倍率和比例尺（按 `unit.per` 换算）、阶段胶囊、三块 SVG 面板，全部写成 t 的纯函数，所以录制时完全确定。
10. **逐帧录制**：`renderAt(t)` 渲染一帧，等一次 rAF，再用 CDP 截 jpeg，通过管道交给 ffmpeg 编码（libx264、crf 18）。速度大约是实时的 4–5 倍慢。DPR 为 2 时，1080×1350 的页面输出 2160×2700 的视频。

## 可扩展
- **爆炸分层**：给某类结构加一个 `uExplode` uniform，在顶点着色器里沿法线外推，就能做原片里"细胞分层拆开"的镜头。
- **景深**：在后期里读深度纹理，按焦平面距离做简单模糊（RT 需要加 depthTexture）。
- **流动**：囊泡沿 CatmullRom 曲线运动，可以在 `renderAt` 里按 t 更新实例矩阵（只更新少数实例），做"货物运输"。
- **竖版**：把 `index.html` 改成 1080×1920，再给 `#stage` 加高。

## 真结构路线（需要论文级准确时用）
| 工具 | 用途 | 自动化方式 |
|---|---|---|
| Molecular Nodes（Blender） | 用 PDB、AlphaFold、cryo-EM、cellPACK 的数据拍电影 | Blender 无头运行 Python 脚本 |
| Mol* / Mesoscale Explorer | 在浏览器里看整个病毒、支原体全细胞 | 快照动画，`encodeMp4Animation` |
| ChimeraX | 蛋白结构动画 | `.cxc` 脚本：`movie record; turn y 2 180; wait 180; movie encode` |
| cellPACK | 科学排布数据（细胞质、HIV、支原体配方） | 导出给 Mol* 或 MN |

调研全文（资源表和 14 条技法）：工作区 `research/bio-viz-skill/调研报告.md`。
