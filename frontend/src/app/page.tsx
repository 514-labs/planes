import { AircraftDashboard } from "@/components/aircraft-dashboard";
import { AircraftDirectionChart } from "@/components/aircraft-direction-chart";

export default function Home() {
  return (
    <div className="container mx-auto p-4 space-y-8">
      <AircraftDashboard />
      <AircraftDirectionChart />
    </div>
  );
}
