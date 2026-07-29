# zhdate AI Calendar 系统架构设计文档（System Architecture）


# 1. 系统概述


zhdate 是一个基于大语言模型（LLM）的智能日程助手。

系统通过：

- Web 前端交互
- FastAPI 后端服务
- DeepSeek 大模型
- 结构化数据解析

实现：

自然语言输入 → AI理解 → 日历事件生成。


---

# 2. 整体架构


系统整体流程：


```
                User

                 |

                 ↓

        Frontend Interface

        HTML + CSS + JavaScript

                 |

                 ↓

          FastAPI Backend

                 |

                 ↓

          DeepSeek LLM API

                 |

                 ↓

       Structured JSON Output

                 |

                 ↓

        Calendar Event Display

```


---

# 3. 前端架构（Frontend）


## 技术组成


使用：

- HTML
- CSS
- JavaScript


负责：


### 用户交互


包括：

- 输入日程内容
- 点击AI记录按钮
- 回车提交


---

### 页面展示


包括：

- 日历组件
- AI解析结果
- 提醒建议


---

# 4. 后端架构（Backend）


## 技术组成


使用：

- Python
- FastAPI


主要职责：

1. 接收用户输入

2. 调用大语言模型

3. 处理AI返回结果

4. 返回结构化数据


---

## API流程


用户输入：


```
{
"text":"周三下午五点给朋友过生日"
}
```


发送到后端。


后端处理：


```
接收请求

↓

构造Prompt

↓

调用DeepSeek API

↓

获取模型结果

↓

解析JSON

↓

返回前端
```


---

# 5. AI模型层（LLM Layer）


## 模型选择


当前使用：

DeepSeek LLM


原因：


### 中文理解能力


适合处理：

- 中文时间表达
- 日常语言描述


### API调用方便


能够快速集成到应用。


---

# 6. 数据交互设计


## 输入


用户自然语言：

例如：

```
下周三下午三点参加项目会议
```


---

## AI处理


模型提取：

```
title

date

time

advice
```


---

## 输出


JSON格式：


```json
{
"title":"项目会议",
"date":"下周三",
"time":"15:00",
"advice":"提前准备会议材料"
}
```


---

# 7. 为什么采用前后端分离设计


## 优点


### 1. 易维护


前端负责：

用户体验


后端负责：

业务逻辑


---

### 2. 易扩展


未来可以增加：

- 用户系统
- 数据库存储
- 移动端应用


---

### 3. AI能力独立


未来可以替换：

- DeepSeek
- GPT
- Claude
- 本地模型


而不影响前端。


---

# 8. 安全设计


## API Key管理


不直接写入代码。


使用：

```
.env
```


保存：

```
DEEPSEEK_API_KEY
```


并通过环境变量读取。


---

# 9. 当前系统限制


## 1. 数据持久化不足


当前：

日程主要保存在前端状态。


未来：

增加数据库。


---

## 2. AI解析可能存在误差


例如：

模糊时间：

- 最近
- 过几天
- 晚点


未来需要：

时间校验机制。


---

# 10. 未来技术优化


## 数据层

增加：

- SQLite
- PostgreSQL


保存：

- 用户日程
- 历史记录


---

## AI Agent层


增加：

- 用户习惯学习
- 自动规划
- 主动提醒


---

# 总结


zhdate 的系统设计目标：

通过前端交互、后端服务和大语言模型结合，

构建一个：

> 能理解用户自然语言的 AI 日程管理系统。
