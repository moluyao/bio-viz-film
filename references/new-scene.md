# 新建一个场景（scene-xxx.js）

照着 `scene-virus.js` 写。它是独立的一份：从 `scene-cell.js` 导入 `CATS / rng / makeUniforms`，自己带一份 `patch()`。

## 必须满足的接口
```js
export { makeUniforms };                        // 直接转出 scene-cell 里的
export function buildCell(scene, U, seed) {     // 函数名固定，app.js 按这个名字找
  ...
  return { anchors, count, CELL: 半径 };         // anchors 至少要有 center，以及 story 里用到的每个锚点
}
```
页面用 `?scene=xxx` 加载 `scene-xxx.js`。story 默认读同名的 `story-xxx.js`，也可以用 `?story=` 另外指定。

## 16 个色槽（CATS）的借用规则
色槽名字是按细胞起的，换了题材就按"视觉角色"来借用，并在文件头注释里写清楚对应关系，例如：
- `lipid`、`shell`：最外层的壁或膜
- `protA/B/C`：数量最多的三类小颗粒
- `chromatin`：遗传物质
- `nucleolus`：遗传物质上的结合蛋白
- `filopod`：外部的细长结构
- `vesicle`：半透明的小球
- `ribosome`：最小的点缀颗粒

这样主题色板不用改，一样能用。

## 构建要点
- **球面均匀分布**用 `fib(n)`，再乘上 `wobble(d)` 加一点不规则起伏，看起来更像生物。
- **膜**由三层组成：外层小球、内层小球、中间一层半透明壳（opacity 0.5，depthWrite 关闭）。
- **细丝或链**：用 CatmullRomCurve3 生成 TubeGeometry，再沿曲线摆一串小球（例如 DNA 上的核小体、RNA 上的 N 蛋白）。
- **片层**（ER、类囊体、高尔基体）：在同心球面的一个锥形区域里铺压扁的小球，`s: V(.15,.15,.06)` 再加 `n: 法线`。不要用整块的 SphereGeometry 帽子，从侧面看会变成实心的板。
- **想让镜头看到的结构，必须跨过剖切面（z≈0.8）**。整个埋在剖切面下面的结构，会被蛋白地毯盖住。
- 细胞质填充要用 `free(p)` 避开大的细胞器。病毒内部是空的，要用 RNA 链填满，不然剖开后里面是空的。
- 外部的环境（宿主膜、抗体）要放在 `uCutR` 半径以外，才不会被剖切。
- 实例总数控制在 15 万以内；TubeGeometry 网格控制在几百个以内。

---
# v2 场景接口（site2，推荐）

```js
import { V, UP, fib, Builder, Pool, GEO, ease, win, clamp01 } from './lib.js';
export const PALETTE = { 结构名: '#hex', ..., tracer: '#ffe27a' };   // 讲解版式的图例直接读这个表
export function build(scene, seed) {
  const B = new Builder(scene, seed);
  // 静态结构：B.inst(geo, material, items)，items 是 {p, s, n|q} 的数组
  // 动态演员：new Pool(scene, geo, material, max)，每帧依次调用 begin → add → end
  B.bakeAO();                                   // 所有静态实例生成之后调用一次，烘焙环境光遮蔽
  return { anchors, update(t, T) {...}, palette: PALETTE, count: B.count };
}
```
- `anchors` 的值可以是固定的 Vector3，也可以是函数 `(t, T) => Vector3`，后者用于相机跟随运动中的演员。
- `update(t, T)` 必须是纯函数，内部不能有 Math.random，也不能有 Date。
- 剖切面由 engine 统一管理（全局 clippingPlanes，z > cut 的部分不渲染），scene 不需要处理。
- 透明材质只用在薄膜上（囊泡、分泌颗粒的膜）。体积较大的细胞器（线粒体）用不透明材质，这样被剖开后能看到双层膜和嵴。
- **不要用屏幕空间 AO（GTAO）**：它会在透明物体和剖切面附近产生成片的黑色伪影。改用 `B.bakeAO()`。
- 细胞质填充要避开演员的运动路径，参见 `pathClear` 的写法，否则移动的囊泡会穿过蛋白颗粒。
- 排除区要贴合结构的真实形状（例如高尔基体堆叠的弧形）。用方盒做排除会在旁边留下空坑，空坑在画面上就是黑洞。
