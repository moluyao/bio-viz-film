# 案例：类囊体光反应（v4，2026-11-22）

- 课本：人教版 必修1《分子与细胞》5.4 光合作用 · 光反应；画面英文。
- 场景：`template/site2/scene-thylakoid.js`（1 单位 = 1 nm），故事：`story-thylakoid-en.js`，版式 `bench`。
- 结构：PDB 5XNL、4XK8、2BHW（豌豆），6RQF、6FKF、1RCX、1FNB、1A70、1AG6（菠菜），膜蛋白定向用 OPM 数据库。
- 出片：
  ```
  node tools/record.mjs site2 out/quick.mp4 --size 1080x1350 --dpr 2 --scale 1080x1350 --fps 60 --query story=thylakoid-en
  node tools/export_blender.mjs site2 "story=thylakoid-en" out/blender/thylakoid --fps 24
  blender -b --factory-startup --python tools/blender_build.py -- out/blender/thylakoid out/blender/frames --samples 16
  node tools/record.mjs site2 --size 1080x1350 --dpr 1 --fps 24 --query "story=thylakoid-en&uionly=1" --overlay-dir out/blender/ui
  ffmpeg -framerate 24 -i out/blender/frames/%05d.png -framerate 24 -i out/blender/ui/%05d.png -filter_complex overlay out/pro.mp4
  python tools/bgm_thylakoid.py out/bgm.wav
  ```
- 独立审查（1 轮）：结构的膜内朝向、电子传递顺序、c₁₄ 环转一圈产 3 个 ATP 都核对正确。审查要求修改的地方已全部改完：
  - 计数按化学计量自洽；
  - pH 随 H⁺ 变化；
  - 画出 PQ 从基质一侧摄取 H⁺；
  - 加大过程标记；
  - 被剖切的珠子不再是空心壳；
  - 回顾镜头重新取景；
  - 说明 PSII 与 PSI/ATP 合酶在膜上分区分布。
- 已知简化（页脚已注明）：
  - 只画了一条电子路径，复合体之间的距离缩短了；
  - 基质片层做了简化；
  - H⁺ 只在移动时画出；
  - ATP 合酶转子卡片标为 ILLUSTRATIVE（示意）。
