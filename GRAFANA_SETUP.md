# Grafana Setup Guide for Dehla Pakad

## Current Setup Analysis

### ✅ What's Already Good

- **Prometheus metrics endpoint** at `/api/metrics` properly configured
- **Comprehensive metrics collection** with gauges, counters, and histograms
- **Regular metric updates** every 30 seconds
- **Default Node.js metrics** included (CPU, memory, event loop)

### 🔧 Improvements Made

1. **Enhanced response time buckets** for better precision
2. **Added room size distribution** tracking
3. **Game duration tracking** for performance analysis
4. **Error tracking** with labels for error type and component
5. **Redis operations monitoring** for database performance
6. **Active bots counter** for bot management insights

## Prometheus Configuration

Add this job to your `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "dehla-pakad"
    static_configs:
      - targets: ["your-app-url.com:443"] # Replace with your Render URL
    scrape_interval: 30s
    metrics_path: "/api/metrics"
    scheme: "https" # Use https for Render deployment
```

## Grafana Data Source Setup

1. **Add Prometheus Data Source**:

   - URL: Your Prometheus server URL
   - Access: Server (default)
   - Scrape interval: 30s

2. **Import Dashboard**:
   - Copy the content from `grafana-dashboard.json`
   - Go to Grafana → Dashboards → Import
   - Paste the JSON content

## Dashboard Features

### 📊 Key Panels

1. **Real-time Player Activity**

   - Active users, connections, players in game, waiting players
   - Color-coded stats with thresholds

2. **System Performance**

   - CPU usage, memory consumption, event loop lag
   - Thresholds: Yellow at 70%, Red at 90%

3. **Game Statistics**

   - Games started/completed per 5 minutes
   - Card plays and bot actions rates

4. **Response Time Distribution**

   - Heatmap showing response time patterns
   - Helps identify performance bottlenecks

5. **Error Monitoring**

   - Error rates by type and component
   - Critical for debugging issues

6. **Redis Operations**
   - Database operation rates and success/failure
   - Essential for Redis performance monitoring

### 🎯 Alerting Rules (Recommended)

Create these alerts in Grafana:

```yaml
# High CPU Usage
- alert: HighCPUUsage
  expr: rate(dehla_pakad_process_cpu_user_seconds_total[5m]) * 100 > 80
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "High CPU usage detected"

# High Memory Usage
- alert: HighMemoryUsage
  expr: dehla_pakad_process_resident_memory_bytes / 1024 / 1024 > 400
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High memory usage detected"

# High Error Rate
- alert: HighErrorRate
  expr: rate(dehla_pakad_errors_total[5m]) > 0.1
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "High error rate detected"

# Too Many Concurrent Users
- alert: TooManyUsers
  expr: dehla_pakad_active_users_total > 5000
  for: 1m
  labels:
    severity: warning
  annotations:
    summary: "Approaching user capacity limit"
```

## Key Metrics to Monitor

### 🔍 Performance Metrics

- **Response Time**: `dehla_pakad_response_time_seconds`
- **CPU Usage**: `rate(dehla_pakad_process_cpu_user_seconds_total[5m]) * 100`
- **Memory**: `dehla_pakad_process_resident_memory_bytes`
- **Event Loop Lag**: `dehla_pakad_nodejs_eventloop_lag_seconds`

### 👥 User Metrics

- **Active Users**: `dehla_pakad_active_users_total`
- **Players in Game**: `dehla_pakad_players_in_game_total`
- **Players Waiting**: `dehla_pakad_players_waiting_total`
- **Socket Connections**: `dehla_pakad_socket_connections_total`

### 🎮 Game Metrics

- **Games Started**: `rate(dehla_pakad_games_started_total[5m])`
- **Games Completed**: `rate(dehla_pakad_games_completed_total[5m])`
- **Card Plays**: `rate(dehla_pakad_card_plays_total[5m])`
- **Bot Actions**: `rate(dehla_pakad_bot_actions_total[5m])`

### 💾 Infrastructure Metrics

- **Redis Operations**: `rate(dehla_pakad_redis_operations_total[5m])`
- **Error Rate**: `rate(dehla_pakad_errors_total[5m])`
- **Room Distribution**: `dehla_pakad_room_size_distribution_bucket`

## Scaling Thresholds

### 🚨 Warning Levels (Based on 512MB RAM, 0.5 CPU)

- **Users**: > 4,000 concurrent users
- **CPU**: > 70% utilization
- **Memory**: > 400MB usage
- **Response Time**: > 500ms average
- **Error Rate**: > 0.05 errors/second

### 🔴 Critical Levels

- **Users**: > 6,000 concurrent users
- **CPU**: > 90% utilization
- **Memory**: > 480MB usage
- **Response Time**: > 2s average
- **Error Rate**: > 0.1 errors/second

## Next Steps

1. **Deploy Prometheus** to scrape your metrics endpoint
2. **Import the dashboard** using the provided JSON
3. **Set up alerting** using the recommended rules
4. **Monitor scaling metrics** as user base grows
5. **Consider upgrading** CPU/memory when approaching thresholds

## Dashboard URL Variables

The dashboard includes these useful variables:

- **$interval**: Auto-adjusting time interval for queries
- **$\_\_rate_interval**: Optimal rate interval for counters
- **Refresh rate**: 5 seconds for real-time monitoring

This setup will give you comprehensive visibility into your game's performance and help you scale proactively!
