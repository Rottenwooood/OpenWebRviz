# WebBot-Viz 技术文档

## 项目概述

WebBot-Viz 是一个基于 Web 的 ROS 2 可视化工具，类似轻量级 RViz，通过 rosbridge_websocket 连接 ROS 2 仿真环境并以 2D 方式渲染传感器数据和地图。

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Bun 1.3.x |
| 后端 | Hono + Drizzle ORM (SQLite) + Better-Auth |
| 前端 | React 18 + Vite + TypeScript |
| 样式 | Tailwind CSS |
| ROS 通信 | roslib (npm 包) |
| 渲染 | HTML5 Canvas API |

## 项目结构

```
packages/
├── server/           # Hono 后端
│   ├── src/          # 服务端代码
│   ├── db/           # Drizzle 数据库
│   └── package.json
└── client/           # React 前端
    ├── src/
    │   ├── components/   # UI 组件
    │   │   ├── ConnectionStatus.tsx   # 连接状态
    │   │   ├── LayerControl.tsx      # 图层控制
    │   │   └── MapCanvas.tsx         # 地图画布
    │   ├── hooks/          # React Hooks
    │   │   ├── useRosConnection.ts   # ROS 连接管理
    │   │   ├── useRosMap.ts          # 地图订阅
    │   │   ├── useRosTf.ts           # TF 坐标变换
    │   │   └── useRosLaserScan.ts    # 激光扫描
    │   ├── lib/            # 工具函数
    │   ├── ros-types.ts    # ROS 消息类型定义
    │   └── App.tsx         # 主应用
    └── package.json
doc/                   # 文档
├── initialization.md   # 初始化文档
├── connection_manager.md
├── map_and_tf.md
└── laser_scan.md
```

## 已实现功能

### 1. Connection Manager
- 通过 WebSocket 连接到 rosbridge_websocket (默认 ws://localhost:9090)
- 连接状态管理：disconnected / connecting / connected / error
- 10 秒连接超时
- 手动重连按钮
- 重连计数显示
- 脚本加载状态检测

### 2. Map & TF Rendering
- 订阅 `/map` 话题 (nav_msgs/msg/OccupancyGrid)
- 订阅 `/tf` 获取机器人位置 (map → base_link)
- Canvas 渲染：
  - 栅格地图（白色=空闲，灰色=未知，黑色=占用）
  - 机器人位置（绿色圆圈 + 方向箭头）
  - 1 米间隔网格线
  - 原点标记
- 交互：
  - 鼠标拖拽平移
  - 滚轮缩放
- 信息叠加层：分辨率、尺寸、比例尺
- 图例

### 3. LaserScan Layer
- 订阅 `/scan` 话题 (sensor_msgs/msg/LaserScan)
- 极坐标转笛卡尔坐标
- 从激光帧变换到地图帧
- 渲染为红色点
- 侧边栏 Toggle 控制
- 图例显示点数

### 4. Layer Control
- Context 共享图层状态
- Checkbox Toggle 控制各图层显隐
- 默认状态：Map=ON, Robot=ON, Laser=OFF

### 5. 启动脚本
- `start_webbot_viz.sh` 一键启动脚本
- 包含：Gazebo 仿真、rosbridge_websocket、SLAM toolbox
- 注意：TurtleBot3 需要使用 TwistStamped 类型控制机器人

## 未实现功能

### 1. Navigation Paths (Step 5)
- 全局路径：`/move_base/NavfnROS/plan` (nav_msgs/msg/Path)
- 局部路径：`/move_base/TCPlanner/local_plan` (nav_msgs/msg/Path)
- 需要渲染为彩色折线（全局=绿色，局部=红色）
- Toggle 控制

### 2. Costmap Layer
- `/move_base/global_costmap/costmap`
- `/move_base/local_costmap/costmap`

### 3. TF Tree Visualization
- 显示完整的 TF 变换树
- 可视化所有坐标帧

### 4. 认证系统
- Better-Auth 集成
- 用户登录/注册

### 5. 数据持久化
- Drizzle ORM + SQLite
- 保存/加载可视化配置

## ROS 话题依赖

Phase 1 所需话题：

| 话题 | 类型 | 状态 |
|------|------|------|
| `/scan` | sensor_msgs/msg/LaserScan | ✅ 已实现 |
| `/map` | nav_msgs/msg/OccupancyGrid | ✅ 已实现 |
| `/tf` | tf2_msgs/msg/TFMessage | ✅ 已实现 |
| `/tf_static` | tf2_msgs/msg/TFMessage | ✅ 已实现 |
| `/move_base/NavfnROS/plan` | nav_msgs/msg/Path | ❌ 未实现 |
| `/move_base/TCPlanner/local_plan` | nav_msgs/msg/Path | ❌ 未实现 |

## 关键实现细节

### roslib 连接方式
```typescript
// 本地 npm 安装，不使用 CDN
import * as ROSLIB from 'roslib';
const ros = new ROSLIB.Ros({ url: 'ws://localhost:9090' });
```

### 话题订阅
```typescript
const topic = new ROSLIB.Topic({
  ros,
  name: '/map',
  messageType: 'nav_msgs/msg/OccupancyGrid',
  compression: 'png'  // 启用压缩减少带宽
});
```

### TF 变换
```typescript
const tfClient = new ROSLIB.TFClient({
  ros,
  fixedFrame: 'map',
  angularThres: 0.01,
  transThres: 0.01
});
tfClient.subscribe('base_link', (transform) => {
  // transform.translation.x/y/z
  // transform.rotation (quaternion)
});
```

### Canvas 渲染循环
```typescript
useEffect(() => {
  let animationId;
  const render = () => {
    draw();  // 渲染逻辑
    animationId = requestAnimationFrame(render);
  };
  render();
  return () => cancelAnimationFrame(animationId);
}, [draw]);
```

## 运行方式

```bash
# 安装依赖
bun install

# 启动前后端
bun run dev

# 前端：http://localhost:3000
# 后端：http://localhost:4000

# ROS 启动（需要先启动仿真）
export TURTLEBOT3_MODEL=burger
ros2 launch turtlebot3_gazebo turtlebot3_world.launch.py
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
ros2 launch slam_toolbox online_async_launch.py

# 控制机器人（使用 TwistStamped）
ros2 topic pub /cmd_vel geometry_msgs/msg/TwistStamped "{header: {stamp: {sec: 0, nanosec: 0}, frame_id: ''}, twist: {linear: {x: 0.1, y: 0.0, z: 0.0}, angular: {x: 0.0, y: 0.0, z: 0.0}}}" -r 10
```

## 已知问题

1. **TurtleBot3 TwistStamped**: ros_gz_bridge 期望 TwistStamped 类型，teleop_twist_keyboard 默认发布 Twist，需使用 `cmd_vel_stamped:=true` 参数

2. **CDN 访问**: 某些网络环境下 jsdelivr/unpkg CDN 可能被拦截，已改用本地 npm 包

3. **Gazebo 无显示**: 无头环境下 Gazebo 可能显示警告但不影响 ROS 话题发布

## Git 提交记录

```
e04e00bf feat: Add LaserScan layer visualization
3c368c7d feat: Implement Map & TF rendering with canvas
682423a4 feat: Implement Connection Manager with state management
c506d6f7 feat: Initialize WebBot-Viz monorepo structure
```
