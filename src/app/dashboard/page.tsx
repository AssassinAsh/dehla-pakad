"use client";

import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Define a type for a single metric object
interface Metric {
  name: string;
  help: string;
  type: string;
  values: {
    value: number;
    labels: Record<string, string>;
  }[];
  aggregator: string;
}

const StatCard = ({
  title,
  value,
  help,
}: {
  title: string;
  value: string;
  help: string;
}) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center transform hover:scale-105 transition-transform duration-300">
    <h3 className="text-xl font-semibold text-gray-400 mb-2">{title}</h3>
    <p className="text-5xl font-bold text-dp-neon">{value}</p>
    <p className="text-sm text-gray-500 mt-2">{help}</p>
  </div>
);

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/metrics");
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const data = await response.json();
        setMetrics(data);
        setError(null);
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError(String(e));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics(); // Initial fetch
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  const getMetricValue = (name: string): string => {
    const metric = metrics.find((m) => m.name === name);
    return metric?.values?.[0]?.value?.toString() ?? "N/A";
  };

  const getMetric = (name: string): Metric | undefined => {
    return metrics.find((m) => m.name === name);
  };

  const heapUsed = getMetric("dehla_pakad_nodejs_heap_size_used_bytes");
  const heapTotal = getMetric("dehla_pakad_nodejs_heap_size_total_bytes");

  const memoryData = {
    labels: ["Memory"],
    datasets: [
      {
        label: "Heap Used (MB)",
        data: heapUsed
          ? [(heapUsed.values[0].value / (1024 * 1024)).toFixed(2)]
          : [0],
        backgroundColor: "rgba(0, 210, 255, 0.6)",
        borderColor: "rgba(0, 210, 255, 1)",
        borderWidth: 1,
      },
      {
        label: "Heap Total (MB)",
        data: heapTotal
          ? [(heapTotal.values[0].value / (1024 * 1024)).toFixed(2)]
          : [0],
        backgroundColor: "rgba(100, 100, 100, 0.4)",
        borderColor: "rgba(100, 100, 100, 1)",
        borderWidth: 1,
      },
    ],
  };

  const memoryOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Node.js Heap Memory Usage",
        color: "#FFF",
      },
    },
    scales: {
      y: {
        ticks: { color: "#FFF" },
        title: {
          display: true,
          text: "MB",
          color: "#FFF",
        },
      },
      x: {
        ticks: { color: "#FFF" },
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Loading Metrics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-center text-dp-neon">
          Server Metrics Dashboard
        </h1>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Users"
          value={getMetricValue("dehla_pakad_active_users_total")}
          help={getMetric("dehla_pakad_active_users_total")?.help ?? ""}
        />
        <StatCard
          title="Active Rooms"
          value={getMetricValue("dehla_pakad_active_rooms_total")}
          help={getMetric("dehla_pakad_active_rooms_total")?.help ?? ""}
        />
        <StatCard
          title="Players In Game"
          value={getMetricValue("dehla_pakad_players_in_game_total")}
          help={getMetric("dehla_pakad_players_in_game_total")?.help ?? ""}
        />
        <StatCard
          title="Event Loop Lag"
          value={`${(
            parseFloat(
              getMetricValue("dehla_pakad_nodejs_eventloop_lag_seconds")
            ) * 1000
          ).toFixed(2)} ms`}
          help={
            getMetric("dehla_pakad_nodejs_eventloop_lag_seconds")?.help ?? ""
          }
        />
      </main>

      <section className="mt-12 bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Memory Usage
        </h2>
        <Bar options={memoryOptions} data={memoryData} />
      </section>
    </div>
  );
}
