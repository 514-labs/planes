/**
 * Aircraft Dashboard Component
 *
 * Main dashboard displaying real-time aircraft tracking data with interactive visualizations.
 *
 * Features:
 * - Real-time data fetching from backend consumption API
 * - Interactive charts (bar, scatter, pie) showing altitude, speed, and category distributions
 * - Filterable data table with search and filter capabilities
 * - Summary statistics cards with trend indicators
 * - Integrated chat interface via floating button (bottom-right corner)
 *
 * Data Structure:
 * - Fetches from: /consumption/aircraftSpeedAltitudeByType
 * - Supports filtering by: category, altitude range, speed range
 * - Displays 9 aircraft categories (A0-A7, D7)
 *
 * Chat Integration:
 * - Floating MessageSquare button triggers ChatSidebar
 * - Allows natural language queries to ClickHouse data
 * - See chat-sidebar.tsx for implementation details
 */

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ScatterChart, Scatter, PieChart, Pie, Cell } from "recharts";
import { Plane, TrendingUp, TrendingDown, Activity, Filter, X, MessageSquare } from "lucide-react";
import { ChatSidebar } from "@/components/chat-sidebar";

interface AircraftData {
  aircraft_category: string;
  total_records: string;
  avg_barometric_altitude: number;
  min_barometric_altitude: number;
  max_barometric_altitude: number;
  altitude_stddev: number;
  avg_ground_speed: number;
  min_ground_speed: number;
  max_ground_speed: number;
  speed_stddev: number;
  unique_aircraft_count: string;
}

interface FilterParams {
  category?: string;
  minAltitude?: number;
  maxAltitude?: number;
  minSpeed?: number;
  maxSpeed?: number;
}

const CATEGORY_COLORS = {
  A0: "#8884d8",
  A1: "#82ca9d",
  A2: "#ffc658",
  A3: "#ff7300",
  A4: "#8dd1e1",
  A5: "#d084d0",
  A6: "#ffb347",
  A7: "#87ceeb",
  D7: "#ff6b6b",
};

const CATEGORY_DESCRIPTIONS = {
  A0: "No ADS-B Emitter Category",
  A1: "Light (< 15,500 lbs)",
  A2: "Small (15,500-75,000 lbs)",
  A3: "Large (75,000-300,000 lbs)",
  A4: "High Vortex Large",
  A5: "Heavy (> 300,000 lbs)",
  A6: "High Performance",
  A7: "Rotorcraft",
  D7: "No Category Info",
};

const chartConfig = {
  altitude: {
    label: "Altitude (ft)",
    color: "hsl(var(--chart-1))",
  },
  speed: {
    label: "Speed (kts)",
    color: "hsl(var(--chart-2))",
  },
  count: {
    label: "Aircraft Count",
    color: "hsl(var(--chart-3))",
  },
};

export function AircraftDashboard() {
  const [data, setData] = useState<AircraftData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterParams>({});
  const [showFilters, setShowFilters] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const fetchData = async (filterParams: FilterParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(
        `${baseUrl}/consumption/aircraftSpeedAltitudeByType?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterChange = (key: keyof FilterParams, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchData(filters);
  };

  const clearFilters = () => {
    setFilters({});
    fetchData();
  };

  const totalAircraft = data.reduce((sum, item) => sum + parseInt(item.unique_aircraft_count), 0);
  const totalRecords = data.reduce((sum, item) => sum + parseInt(item.total_records), 0);
  const avgAltitude = data.reduce((sum, item) => sum + item.avg_barometric_altitude * parseInt(item.total_records), 0) / totalRecords;
  const avgSpeed = data.reduce((sum, item) => sum + item.avg_ground_speed * parseInt(item.total_records), 0) / totalRecords;

  // Sort data alphabetically by aircraft category for bar charts
  const sortedData = [...data].sort((a, b) => a.aircraft_category.localeCompare(b.aircraft_category));

  const scatterData = data.map(item => ({
    ...item,
    altitude: item.avg_barometric_altitude,
    speed: item.avg_ground_speed,
  }));

  const pieData = data.map(item => ({
    name: item.aircraft_category,
    value: parseInt(item.unique_aircraft_count),
    color: CATEGORY_COLORS[item.aircraft_category as keyof typeof CATEGORY_COLORS] || "#8884d8",
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 animate-spin" />
          <span>Loading aircraft data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading data: {error}</p>
          <Button onClick={() => fetchData()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Speed & Altitude Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time aircraft tracking data showing barometric altitude and ground speed by category
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Filter aircraft data by category, altitude, and speed ranges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={filters.category || ""} onValueChange={(value) => handleFilterChange('category', value || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {Object.entries(CATEGORY_DESCRIPTIONS).map(([key, desc]) => (
                      <SelectItem key={key} value={key}>
                        {key} - {desc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="minAltitude">Min Altitude (ft)</Label>
                <Input
                  id="minAltitude"
                  type="number"
                  placeholder="0"
                  value={filters.minAltitude || ""}
                  onChange={(e) => handleFilterChange('minAltitude', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>

              <div>
                <Label htmlFor="maxAltitude">Max Altitude (ft)</Label>
                <Input
                  id="maxAltitude"
                  type="number"
                  placeholder="50000"
                  value={filters.maxAltitude || ""}
                  onChange={(e) => handleFilterChange('maxAltitude', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>

              <div>
                <Label htmlFor="minSpeed">Min Speed (kts)</Label>
                <Input
                  id="minSpeed"
                  type="number"
                  placeholder="0"
                  value={filters.minSpeed || ""}
                  onChange={(e) => handleFilterChange('minSpeed', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>

              <div>
                <Label htmlFor="maxSpeed">Max Speed (kts)</Label>
                <Input
                  id="maxSpeed"
                  type="number"
                  placeholder="1000"
                  value={filters.maxSpeed || ""}
                  onChange={(e) => handleFilterChange('maxSpeed', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={applyFilters}>Apply Filters</Button>
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Aircraft</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAircraft.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Unique aircraft tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Data points collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Altitude</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgAltitude.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft</div>
            <p className="text-xs text-muted-foreground">
              Barometric altitude
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Speed</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSpeed.toLocaleString(undefined, { maximumFractionDigits: 0 })} kts</div>
            <p className="text-xs text-muted-foreground">
              Ground speed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Altitude by Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Average Altitude by Aircraft Category</CardTitle>
            <CardDescription>
              Barometric altitude (feet) - company standard definition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="aircraft_category" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="avg_barometric_altitude"
                  fill="var(--color-altitude)"
                  name="Avg Altitude (ft)"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Speed by Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Average Speed by Aircraft Category</CardTitle>
            <CardDescription>
              Ground speed (knots) - note: company standard specifies air speed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="aircraft_category" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="avg_ground_speed"
                  fill="var(--color-speed)"
                  name="Avg Speed (kts)"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Speed vs Altitude Scatter Plot */}
        <Card>
          <CardHeader>
            <CardTitle>Speed vs Altitude Correlation</CardTitle>
            <CardDescription>
              Relationship between average speed and altitude by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ScatterChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="altitude"
                  name="Altitude (ft)"
                  type="number"
                />
                <YAxis
                  dataKey="speed"
                  name="Speed (kts)"
                  type="number"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Scatter
                  dataKey="speed"
                  fill="var(--color-altitude)"
                  name="Speed vs Altitude"
                />
              </ScatterChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Aircraft Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Aircraft Distribution by Category</CardTitle>
            <CardDescription>
              Number of unique aircraft per category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Aircraft Statistics</CardTitle>
          <CardDescription>
            Comprehensive view of all aircraft categories and their performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-right p-3">Aircraft Count</th>
                  <th className="text-right p-3">Total Records</th>
                  <th className="text-right p-3">Avg Altitude (ft)</th>
                  <th className="text-right p-3">Altitude Range</th>
                  <th className="text-right p-3">Avg Speed (kts)</th>
                  <th className="text-right p-3">Speed Range</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item) => (
                  <tr key={item.aircraft_category} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <Badge style={{ backgroundColor: CATEGORY_COLORS[item.aircraft_category as keyof typeof CATEGORY_COLORS] || "#8884d8" }}>
                        {item.aircraft_category}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {CATEGORY_DESCRIPTIONS[item.aircraft_category as keyof typeof CATEGORY_DESCRIPTIONS] || "Unknown"}
                    </td>
                    <td className="p-3 text-right">{parseInt(item.unique_aircraft_count).toLocaleString()}</td>
                    <td className="p-3 text-right">{parseInt(item.total_records).toLocaleString()}</td>
                    <td className="p-3 text-right">{item.avg_barometric_altitude.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="p-3 text-right text-sm text-muted-foreground">
                      {item.min_barometric_altitude.toLocaleString()} - {item.max_barometric_altitude.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">{item.avg_ground_speed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="p-3 text-right text-sm text-muted-foreground">
                      {item.min_ground_speed.toLocaleString()} - {item.max_ground_speed.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Floating Chat Button */}
      <Button
        onClick={() => setChatOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        aria-label="Open chat"
      >
        <MessageSquare className="size-6" />
      </Button>

      {/* Chat Sidebar */}
      <ChatSidebar open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
} 
