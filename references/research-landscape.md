# 细胞 / 病毒 / 分子生物学可视化视频：现有方法、开源项目与 skill 调研

调研日期：2026-11-20。星数和日期通过 gh API 查得。只查阅了网页，没有下载或运行任何仓库代码。
起因：X 上一条爆款细胞视频。实测帖子正文讲的是"细胞模拟选择性保真提速 200 倍"，视频本身是用 three.js 程序化生成的细胞加实验室仪表盘 UI，属于氛围配图。

## 一、Top 资源表

| # | 名称 | 链接 | 是什么 | 星数 / 最近更新 | 对我们的用处 |
|---|---|---|---|---|---|
| 1 | Molecular Nodes | https://github.com/BradyAJohnston/MolecularNodes | Blender 插件，基于几何节点。可导入 PDB、AlphaFold、MD 轨迹、冷冻电镜密度图、cellPACK 集合，做分子动画 | 1417 / 2026-11 | ★★★ 论文级、教材级真结构电影的首选。可写 Python 脚本，Blender 能无头渲染 |
| 2 | Mol* (molstar) + Mesoscale Explorer | https://github.com/molstar/molstar ，https://molstar.org/me/ | 网页端大分子查看器。ME 可在浏览器里看 HIV 病毒体、支原体整细胞（上亿原子），自带 mp4 导出 | 1045 / 2026-11 | ★★★ 浏览器里的真实数据病毒和整细胞。可用 `encodeMp4Animation` 或快照动画做程序化录制（issue #1365） |
| 3 | ChimeraX movie 命令 | https://www.cgl.ucsf.edu/chimerax/docs/user/commands/movie.html | 用 `.cxc` 脚本做电影：`movie record; turn y 1 360; wait 360; movie encode x.mp4` | 官方，2025-10 有新教程 | ★★★ 写几行脚本就出蛋白旋转、形变、渐变电影，最适合 agent 自动化 |
| 4 | cellPACK / cellPACK Studio | https://github.com/mesoscope/cellpack ，cellpack.allencell.org | Scripps 和 Allen 研究所的介观尺度"细胞打包"工具，带血浆、细胞质、HIV、支原体的配方 | 8 / 2026-11 | ★★ 提供科学准确的分子排布数据，可喂给 Mol* 或 Molecular Nodes |
| 5 | Wayan123/3d-interactive-visuals | https://github.com/Wayan123/3d-interactive-visuals | 39 个标本（原子、细胞、病毒、细胞器……），100% 程序化 three.js | 1 / 2026-05 | ★★★ 和目标视频的技法最接近：BufferGeometry + InstancedMesh + CatmullRomCurve3 + 噪声位移，可直接参考做法 |
| 6 | CellVerse Ultra（three.js 论坛） | https://discourse.threejs.org/t/17-billion-triangles-in-a-browser-how-i-built-cellverse-ultra-a-living-interactive-3d-cell-in-one-week/92778 | 浏览器活细胞："170 亿三角形"（按实例数乘以面数计），InstancedMesh、合并几何、GLSL 注入、景深后处理 | 论坛帖 | ★★★ 讲清了大规模实例化加后处理的实现 |
| 7 | PrototypeVersions/Cell_Explanation | https://github.com/PrototypeVersions/Cell_Explanation | three.js r170 原生 ES 模块。程序化细胞、确定性细节、标签、拾取、货物运输路线 | 0 / 2026-10 | ★★ 小而清晰，可参考标签和运输路线的写法 |
| 8 | aymen94/cellverse | https://github.com/aymen94/cellverse | 真核细胞加生物大分子探索器。核糖体、孔、线粒体等全用 InstancedMesh，管道合并，外视图约 33 个 draw call | 0 / 2026-11 | ★★ 性能预算的参考 |
| 9 | CloudAI-X/threejs-skills | https://github.com/CloudAI-X/threejs-skills | 10 个通用 three.js SKILL.md，覆盖动画、着色器、几何等 | 4308 / 2026-10 | ★★ 通用 3D 底座 skill，不含任何生物内容 |
| 10 | K-Dense scientific-agent-skills | https://github.com/K-Dense-AI/scientific-agent-skills | 约 170 多个科研 skill，有 scientific-visualization、molecular-dynamics、rdkit、alphafold 等 | 57896 / 2026-11 | ★★ 管论文图和数据，没有 3D 细胞视频 skill |
| 11 | jvogan/proteus 及 PyMolClaw、Molecullage | https://github.com/jvogan/proteus ，https://github.com/BioTender-max/PyMolClaw ，https://github.com/danilkotelnikov/Molecullage | Claude 结构生物学 skill：PyMOL 和 ChimeraX 无头渲染、AlphaFold 和 PDB 拉取、论文配图 | 31 / 7 / 3 | ★★ 现成的"蛋白静态图" skill，可借用它们的拉取和无头渲染流程 |
| 12 | manim-Chemistry | https://github.com/UnMolDeQuimica/manim-Chemistry | Manim 插件，2D/3D 分子、轨道，可从 PubChem 拉取 | 96 / 2026-09 | ★ 适合化学和教学讲解动画。没有生物（蛋白、细胞）专用的 Manim 库 |
| 13 | mromidev/claude-animated-shorts | https://github.com/mromidev/claude-animated-shorts | Claude skill：three.js 场景加 Remotion，渲染成短视频 | 4297 / 2026-11 | ★★ 管线可借："three.js 场景 → Remotion 逐帧出片" |
| 14 | ProteinBlender | https://github.com/Animation-Lab/ProteinBlender | 基于 Molecular Nodes 的简化界面，提供蛋白"木偶"、姿态库、关键帧 | 50 / 2026-11 | ★ 用 Blender 做蛋白构象动画时有用 |

补充：Simularium Viewer（Allen，用于播放模拟轨迹）；Goodsell 的 PDB-101 插画是 CC-BY-4.0，可以做配色和构图参考，使用时须署名（发布时注意我们的"不出现素材署名"规则，所以只作内部参考）。

## 二、是否已有现成 skill

**结论：没有。**目前没有一个现成 skill 能完成"程序化细胞或病毒 → 录制成视频"。
- 搜了 GitHub（gh search："three.js cell"、"virus webgl"、"skill molecular visualization"、"manim biology" 等），也搜了各类 skill 目录（skills.lc、mdskills、agenticskills），都没找到面向细胞、病毒、细胞器 3D 视频的 SKILL.md。
- 已有的 skill 分三类：
  1. 蛋白静态图和分析：proteus、PyMolClaw、pymol-visualize-skill、compare-structures-skill、Molecullage、aipoch 的 3d-molecule-ray-tracer；
  2. 通用 three.js：CloudAI-X/threejs-skills、full-stack-skills/threejs-skills；
  3. three.js 加 Remotion 做短视频：claude-animated-shorts，题材是卡通故事。
- 本机已有的 model-compare-video、huashu-motion、repo-video 都具备"逐帧确定性录制网页"的能力，可以作为录制底座。
- 因此需要自建 skill：用 three.js 程序化生物场景，加科学准确性清单，加确定性逐帧录制。真结构的分支走 ChimeraX、Mol* 或 Molecular Nodes。

## 三、可复用的具体技法（14 条）

1. **InstancedMesh 是核心**：膜颗粒、核糖体、核孔、囊泡、刺突蛋白都用一个几何体加 `setMatrixAt` 铺成千上万个实例。按材质分组，draw call 控制在几十个以内（cellverse 约 33 个）。
2. **膜的做法**：在球或椭球上做 Fibonacci 球面采样，放置小球或短柱实例（磷脂头部）。用 3D 噪声做低频位移，让细胞不规则；双层膜用两个半径的壳层。
3. **细胞器参数化**：
   - 线粒体：胶囊体，嵴用内部平面或环面阵列；
   - 内质网：CatmullRomCurve3 随机游走，再接 TubeGeometry 或片层；
   - 高尔基体：5 到 7 层弯曲扁盘叠放，边缘挂小囊泡；
   - 核：双层壳，挂核孔实例，内部放染色质噪声点云；
   - 丝状伪足：从膜表面法线方向挤出细管，尖端渐细。
4. **病毒**：二十面体（IcosahedronGeometry 加细分）做衣壳。刺突沿顶点或面心实例化，朝向法线（`lookAt`）；包膜病毒外加一层脂膜壳。真实刺突数量和尺寸要查文献，例如 SARS-CoV-2 约 24 到 40 个 S 蛋白，直径约 100 nm。
5. **确定性随机**：所有程序化都用固定种子的 PRNG（mulberry32 之类），同一种子每次生成同一个细胞，便于逐帧重录和返工。
6. **时间与帧解耦**：动画全部写成 `render(t)` 纯函数，不用 `requestAnimationFrame` 的真实时钟。录制时按 `t = frame/60` 逐帧推进，再截图（canvas.toBlob 或 Playwright 截图），最后用 ffmpeg 合成，保证 60fps 无掉帧。我们已有的 model-compare-video 和 huashu-motion 都是这个模式。
7. **相机路径**：用 CatmullRomCurve3 定义相机位置曲线和 lookAt 目标曲线，配缓动（easeInOutCubic）。一条曲线做"外观 → 穿膜 → 胞内各细胞器 → 核内"的穿越。也可以按细胞器做关键帧，在帧之间插值。
8. **像素化竖向扫描切换主题**：同一场景用两套配色或材质。全屏后处理 shader 按列像素块和扫描线位置混合两张 RenderTarget，块化公式为 `floor(uv*N)/N`，每隔约 5 秒触发一次扫描。
9. **材质与后处理**：用 MeshPhysical 或 Toon 材质，加菲涅尔边缘光（显微镜感）。EffectComposer 依次叠加 Bloom、按深度的景深（CellVerse 做法）、色差、颗粒和暗角。荧光显微镜风格用黑底加加法混合。
10. **HTML 仪表盘外壳**：three.js canvas 外面套 HTML 和 CSS 的 UI（等宽字体、假数据面板、打字机标签）。标签用 CSS2DRenderer，或者把 3D 坐标投影到屏幕再对齐。假数据也必须由 `t` 驱动，否则逐帧录制会不同步。
11. **真数据分支（论文、教材）**：
    - ChimeraX `.cxc` 脚本（record → turn/roll/coordset → wait → encode），一条命令出 mp4；
    - Mol* 的 mp4-export 扩展或 MolViewSpec 多快照动画；
    - Blender + Molecular Nodes：Python 脚本拉 PDB 或 cellPACK，用 Cycles 或 EEVEE 无头渲染。
12. **介观尺度数据来源**：cellPACK 配方（血浆、细胞质、HIV、支原体）、Mesoscale Explorer 的现成导览、PDB 或 AlphaFold 的单分子结构、Goodsell 的 PDB-101 插画（配色和密度参考）。
13. **科学准确性清单**（教学和论文必备）：
    - 尺度比例：细胞约 10–30 µm，线粒体约 0.5–1 µm，核糖体约 25 nm，病毒约 20–300 nm；
    - 细胞器的相对数量和位置；
    - 胞内实际非常拥挤（Goodsell 风格）；
    - 视频里注明"示意 / 非比例"；
    - 配色是假色，要说明。
14. **性能和画质预算**：每个实例几何体低面数（12–20 段的球）；远处的细胞器降级为点云或 billboard（与原帖"远处粗略近处精细"的思路一致）；录制时用 2× 超采样再缩放，获得抗锯齿。

## 四、建议路线
- 爆款或氛围视频：自建 skill「bio-cell-viz」，用 three.js 程序化（技法 1–10、14），加我们已有的逐帧录制管线。
- 论文、教材或真结构视频：ChimeraX 脚本优先，最简单、可复现；复杂场景用 Molecular Nodes；浏览器整病毒或整细胞用 Mol* Mesoscale Explorer 导出 mp4。
