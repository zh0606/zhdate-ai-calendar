# 🌸 zhdate - AI Smart Calendar Assistant

> An AI-native scheduling assistant powered by DeepSeek LLM.

## 📖 Project Introduction

zhdate is an AI-powered scheduling assistant designed to simplify daily time management.

Instead of manually filling in calendar forms, users can simply describe their plans in natural language.

For example:

> "周三下午五点和朋友吃饭"

The AI automatically extracts:

- Event title
- Date
- Time
- Reminder suggestion

and creates a structured calendar event.

---

## ✨ Features

### 🤖 AI Natural Language Scheduling

Users only need to type one sentence.

Example:

Input:

```
明天下午三点交机器学习报告
```

AI Output:

```json
{
  "title": "提交机器学习报告",
  "date": "2026-07-29",
  "time": "15:00",
  "advice": "提前检查文件，避免遗漏。"
}
```

---

### 📅 Calendar Management

- Monthly calendar
- Daily task list
- Task categories
- Today's schedule

---

### 💡 AI Suggestions

After creating a schedule, AI generates gentle reminder messages based on the event.

---

## 🏗 Tech Stack

Frontend

- HTML
- CSS
- JavaScript

Backend

- Python
- FastAPI

AI

- DeepSeek API
- Prompt Engineering

---

## 📂 Project Structure

```
frontend/
backend/
docs/
screenshots/
README.md
```

---

## 🚀 Future Plan

- AI conflict detection
- Smart schedule adjustment
- AI weekly summary
- Personalized planning

---

## 👨‍💻 Author

ZZH0606
