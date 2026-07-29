# 🌸 zhdate AI Calendar

<p align="center">

An AI-native scheduling assistant that helps users manage time through natural language interaction.

</p>


## 📌 Product Overview

zhdate is an AI-powered smart calendar assistant.

Traditional calendar applications require users to manually enter:

- Event name
- Date
- Time
- Reminder

This creates unnecessary operation costs.

zhdate solves this problem by allowing users to describe their plans naturally.

Example:

> "周三下午五点给朋友过生日"


The AI automatically understands the user's intention and extracts:

- Event title
- Date
- Time
- Reminder suggestion


Then the system creates a structured calendar event.

---

# 🎯 Product Goal

Build an AI-native calendar experience that allows users to manage schedules through conversation.

The goal is:

> "Say what you want to do, AI helps you arrange it."


---

# ✨ Core Features


## 1. 🤖 Natural Language Schedule Creation

Users can create events without manually filling forms.


Example:

Input:

```
明天下午三点提交机器学习报告
```


AI analyzes:

```
Event:
提交机器学习报告

Date:
Tomorrow

Time:
15:00
```


Generated result:

```json
{
"title":"提交机器学习报告",
"date":"2026-07-30",
"time":"15:00",
"advice":"提前检查实验文件"
}
```

---

## 2. 📅 Smart Calendar Display

The system provides:

- Monthly calendar view
- Event visualization
- Daily schedule management


---

## 3. 💡 AI Personalized Reminder

After creating an event, AI generates suggestions.

Example:

> "建议提前30分钟准备相关材料。"


---

# 🏗 Product Workflow


```
User Input

↓

Natural Language Understanding

↓

AI Information Extraction

↓

Structured JSON Generation

↓

Calendar Event Creation

↓

AI Reminder Generation
```


---

# 🧩 System Architecture


```
Frontend

HTML + CSS + JavaScript

        ↓

FastAPI Backend

        ↓

DeepSeek LLM API

        ↓

Structured JSON Response

        ↓

Calendar Interface
```


---

# 🛠 Technology Stack


## Frontend

- HTML
- CSS
- JavaScript


## Backend

- Python
- FastAPI


## AI

- DeepSeek API
- Prompt Engineering
- Structured Output


---

# 📂 Project Structure


```
zhdate-ai-calendar

├── frontend
│
├── backend
│
├── docs
│
├── screenshots
│
└── README.md
```


---

# 📷 Product Demo


## Home Interface

(Add screenshots here)


---

# 🚀 Product Roadmap


## V1.0 Current Version

Completed:

✅ Natural language scheduling

✅ AI event extraction

✅ Calendar visualization

✅ AI reminder


---

## V1.5 Future

Planned:

- Schedule conflict detection
- Multi-turn conversation
- Smart time adjustment


---

## V2.0 AI Agent

Future:

- Learn user habits
- Automatically plan daily schedules
- Generate weekly productivity reports


---

# 📚 Product Documents


Detailed product documents:

- Product Requirement Document
- User Research
- Competitive Analysis
- AI Prompt Design
- Product Roadmap


---

# 👨‍💻 Author

ZZH0606

AI Product Design Project
