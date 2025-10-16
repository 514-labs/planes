"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ScatterChart, Scatter, PieChart, Pie, Cell, RadialBarChart, RadialBar } from "recharts";
import { Compass, TrendingUp, TrendingDown, Activity, Filter, X, Navigation } from "lucide-react";

interface DirectionData {
  direction: string;
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
  avg_heading: number;
}

interface DirectionFilterParams {
  direction?: string;
  minAltitude?: number;
  maxAltitude?: number;
  minSpeed?: number;
  maxSpeed?: number;
}

const DIRECTION_COLORS = {
  "N (0-45°)": "#3b82f6",    // Blue
  "NE (45-90°)": "#06b6d4",  // Cyan
  "E (90-135°)": "#10b981",  // Emerald
  "SE (135-180°)": "#84cc16", // Lime
  "S (180-225°)": "#eab308",  // Yellow
  "SW (225-270°)": "#f97316", // Orange
  "W (270-315°)": "#ef4444",  // Red
  "NW (315-360°)": "#8b5cf6", // Violet
  "Unknown": "#6b7280",      // Gray
};

const DIRECTION_DESCRIPTIONS = {
  "N (0-45°)": "North",
  "NE (45-90°)": "Northeast", 
  "E (90-135°)": "East",
  "SE (135-180°)": "Southeast",
  "S (180-225°)": "South",
  "SW (225-270°)": "Southwest",
  "W (270-315°)": "West",
  "NW (315-360°)": "Northwest",
  "Unknown": "Unknown Direction",
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
  records: {
    label: "Records",
    color: "hsl(var(--chart-4))",
  },
};

export function AircraftDirectionChart() {
  const [data, setData] = useState<DirectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DirectionFilterParams>({});
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = async (filterParams: DirectionFilterParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(
        `http://localhost:4000/api/aircraftSpeedAltitudeByDirection?${queryParams}`
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

  const handleFilterChange = (key: keyof DirectionFilterParams, value: string | number | undefined) => {
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

  // Sort data by direction for consistent display
  const sortedData = [...data].sort((a, b) => {
    const directionOrder = ["N (0-45°)", "NE (45-90°)", "E (90-135°)", "SE (135-180°)", "S (180-225°)", "SW (225-270°)", "W (270-315°)", "NW (315-360°)", "Unknown"];
    return directionOrder.indexOf(a.direction) - directionOrder.indexOf(b.direction);
  });

  // Create compass-oriented pie chart data with proper positioning
  const compassPieData = data.map(item => {
    // Map directions to their compass angles (starting from North at 0°)
    const directionAngles = {
      "N (0-45°)": 0,      // North
      "NE (45-90°)": 45,    // Northeast  
      "E (90-135°)": 90,    // East
      "SE (135-180°)": 135,  // Southeast
      "S (180-225°)": 180,  // South
      "SW (225-270°)": 225, // Southwest
      "W (270-315°)": 270,  // West
      "NW (315-360°)": 315, // Northwest
      "Unknown": 360       // Unknown (place at end)
    };
    
    return {
      name: item.direction,
      value: parseInt(item.unique_aircraft_count),
      color: DIRECTION_COLORS[item.direction as keyof typeof DIRECTION_COLORS] || "#8884d8",
      angle: directionAngles[item.direction as keyof typeof directionAngles] || 360
    };
  }).sort((a, b) => b.angle - a.angle); // Reverse sort to fix E/W positioning

  const scatterData = data.map(item => ({
    ...item,
    altitude: item.avg_barometric_altitude,
    speed: item.avg_ground_speed,
  }));

  const pieData = data.map(item => ({
    name: item.direction,
    value: parseInt(item.unique_aircraft_count),
    color: DIRECTION_COLORS[item.direction as keyof typeof DIRECTION_COLORS] || "#8884d8",
  }));

  // Create radial chart data for compass visualization
  const radialData = data.map(item => ({
    direction: item.direction,
    value: parseInt(item.total_records),
    fill: DIRECTION_COLORS[item.direction as keyof typeof DIRECTION_COLORS] || "#8884d8",
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 animate-spin" />
          <span>Loading direction data...</span>
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
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6" />
            Aircraft Direction Analysis
          </h2>
          <p className="text-muted-foreground">
            Aircraft traffic patterns by compass direction showing altitude and speed distributions
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
            <CardTitle>Direction Filters</CardTitle>
            <CardDescription>
              Filter aircraft data by direction, altitude, and speed ranges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="direction">Direction</Label>
                <Select value={filters.direction || ""} onValueChange={(value) => handleFilterChange('direction', value || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All directions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All directions</SelectItem>
                    {Object.entries(DIRECTION_DESCRIPTIONS).map(([key, desc]) => (
                      <SelectItem key={key} value={key}>
                        {desc}
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
            <Navigation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAircraft.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Unique aircraft by direction
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
              Direction data points
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
              Across all directions
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
              Across all directions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Altitude by Direction Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Average Altitude by Direction</CardTitle>
            <CardDescription>
              Barometric altitude (feet) by compass direction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="direction" />
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

        {/* Speed by Direction Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Average Speed by Direction</CardTitle>
            <CardDescription>
              Ground speed (knots) by compass direction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="direction" />
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
            <CardTitle>Speed vs Altitude by Direction</CardTitle>
            <CardDescription>
              Relationship between average speed and altitude by direction
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

        {/* Direction Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Aircraft Distribution by Direction</CardTitle>
            <CardDescription>
              Number of unique aircraft per direction (oriented like a compass)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <PieChart>
                <Pie
                  data={compassPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false} // Remove labels to clean up the chart
                  outerRadius={100}
                  innerRadius={20} // Create a donut chart for cleaner look
                  fill="#8884d8"
                  dataKey="value"
                  startAngle={90} // Start from North (top) - corrected angle
                  endAngle={450}  // Complete the circle
                >
                  {compassPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value, name) => [
                    `${value} aircraft`,
                    name
                  ]}
                />
              </PieChart>
            </ChartContainer>
            
            {/* Legend below the chart */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              {compassPieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="font-medium">{entry.name}</span>
                  <span className="text-muted-foreground">({entry.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Direction Statistics</CardTitle>
          <CardDescription>
            Comprehensive view of aircraft traffic by compass direction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Direction</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-right p-3">Aircraft Count</th>
                  <th className="text-right p-3">Total Records</th>
                  <th className="text-right p-3">Avg Altitude (ft)</th>
                  <th className="text-right p-3">Altitude Range</th>
                  <th className="text-right p-3">Avg Speed (kts)</th>
                  <th className="text-right p-3">Speed Range</th>
                  <th className="text-right p-3">Avg Heading</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item) => (
                  <tr key={item.direction} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <Badge style={{ backgroundColor: DIRECTION_COLORS[item.direction as keyof typeof DIRECTION_COLORS] || "#8884d8" }}>
                        {item.direction}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {DIRECTION_DESCRIPTIONS[item.direction as keyof typeof DIRECTION_DESCRIPTIONS] || "Unknown"}
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
                    <td className="p-3 text-right">{item.avg_heading.toFixed(1)}°</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
