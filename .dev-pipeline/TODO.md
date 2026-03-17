# klass TODO

## 待修复

### EventSheet 滑动不流畅
- 新建事件页面滑动仍然卡顿
- 已经做过三轮修复（responder → nestedScrollEnabled → 缩小 touch handler 范围）
- 可能需要更彻底的方案：用原生 DateTimePicker 组件替换自定义滚轮，或者完全重写 scroll 协调逻辑

### 待办完成后不下沉
- 完成的待办应该沉到列表底部
- Round 2 时 Codex 认为排序会导致 scroll jump，所以去掉了 is_completed 排序
- 需要找一个既能下沉又不跳动的方案（可能用动画过渡，或延迟重排）

## 待做

### UI 美化
- 整体视觉待和 Gemini 讨论确定方案
- 待办区域的视觉设计还是基本功能样式

### 功能优化
- 待办编辑后回到详情页（目前编辑保存后直接关闭）
- 考虑加待办到期提醒
