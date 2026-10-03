# IDX Exchange - Agentic AI Internship

Work for the IDX Exchange Agentic AI internship: a multi-agent real-estate assistant built on [OpenClaw](https://github.com/openclaw/openclaw), backed by MLS data (`rets_property`, `california_sold`).

## Repository layout

```
deliverables/
  week_1/   OpenClaw architecture fundamentals
  week_2/   ...
scripts/
  check_secrets.sh   pre-push safety check
requirements.txt     Python dependencies
.env.example         Environment variables template
```

## Setup

Developed on Ubuntu 22.04 (WSL) with Python 3.10.

1. Clone the repo and create a virtual environment:

   ```bash
   git clone git@github.com:DucNguyen0159/IDX-Exchange-Agentic-AI.git
   cd IDX-Exchange-Agentic-AI
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. Copy the environment template and fill in your own credentials:

   ```bash
   cp .env.example .env
   ```

3. Install OpenClaw separately by following its [README](https://github.com/openclaw/openclaw). It is not vendored in this repo.

4. MLS SQL dumps are not committed. Import them into your local MySQL instance and point `MYSQL_*` in `.env` at it.

5. Before pushing, run the safety check. It fails if secrets, SQL dumps, or private folders would be committed:

   ```bash
   bash scripts/check_secrets.sh
   ```

## Deliverables

| Week | Topic |
|------|-------|
| [Week 1](deliverables/week_1/README.md) | OpenClaw architecture fundamentals |
