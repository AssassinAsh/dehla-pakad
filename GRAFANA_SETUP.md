# Grafana Cloud Integration Setup

## Overview

Your Dehla Pakad game now exposes Prometheus metrics at `/api/metrics` for real-time monitoring with Grafana Cloud.

## Metrics Available

### Real-Time Game Metrics

- `dehla_pakad_active_users_total` - Number of connected users
- `dehla_pakad_active_rooms_total` - Number of active game rooms
- `dehla_pakad_players_in_game_total` - Players currently playing
- `dehla_pakad_players_waiting_total` - Players waiting for games
- `dehla_pakad_socket_connections_total` - Total socket connections

### Game Activity Counters

- `dehla_pakad_games_started_total` - Total games started
- `dehla_pakad_games_completed_total` - Total games completed
- `dehla_pakad_card_plays_total` - Total cards played
- `dehla_pakad_bot_actions_total` - Total bot actions

### System Performance

- `dehla_pakad_response_time_seconds` - Response time histogram
- `dehla_pakad_process_resident_memory_bytes` - Memory usage
- `dehla_pakad_nodejs_heap_size_used_bytes` - Node.js heap usage
- `dehla_pakad_nodejs_eventloop_lag_seconds` - Event loop lag

## Grafana Cloud Configuration

### 1. Add Data Source

1. Go to your Grafana Cloud dashboard: `ashvinrokade.grafana.net`
2. Navigate to **Connections** → **Data Sources**
3. Click **Add new data source**
4. Select **Prometheus**

### 2. Configure Data Source

- **Name**: `Dehla Pakad Metrics`
- **URL**: `https://your-app-name.onrender.com/api/metrics`
  - Replace `your-app-name` with your actual Render app name
- **Scrape interval**: `30s` (for real-time updates)
- **HTTP Method**: `GET`
- **Access**: `Server (default)`

### 3. Test Connection

Click **Save & Test** to verify the connection works.

## Sample Dashboard Queries

### Active Users Panel

```promql
dehla_pakad_active_users_total
```

### Active Rooms Panel

```promql
dehla_pakad_active_rooms_total
```

### Games per Hour

```promql
rate(dehla_pakad_games_started_total[1h]) * 3600
```

### Memory Usage

```promql
dehla_pakad_process_resident_memory_bytes / 1024 / 1024
```

### Bot Activity Rate

```promql
rate(dehla_pakad_bot_actions_total[5m])
```

## Dashboard Template

Create panels with these visualizations:

- **Stat panels** for current active users/rooms
- **Time series** for games started over time
- **Gauge** for memory usage (with thresholds at 75% and 90%)
- **Bar chart** for player distribution (in-game vs waiting)

## Alert Rules

Set up alerts for:

- High memory usage: `> 400MB` (warning), `> 450MB` (critical)
- High user count: `> 1000` users (capacity planning)
- Zero active users for 10+ minutes (potential downtime)

## Real-Time Updates

Metrics update every:

- **Socket connections**: Immediately on connect/disconnect
- **Room/player counts**: Every 30 seconds
- **Game events**: Immediately when triggered
- **System metrics**: Every 15 seconds (default)

## Your App URL

Your metrics endpoint: `https://your-render-app.onrender.com/api/metrics`

Replace with your actual Render deployment URL when configuring Grafana.
