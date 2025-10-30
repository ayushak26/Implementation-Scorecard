// app/visualization/page.tsx
import VisualizationPage from "../components/VisualizationPage";

export const dynamic = "force-dynamic"; // optional, avoids caching during dev

export default function VisualizationRoute() {
  return (
    <main className="w-screen min-h-screen overflow-x-hidden"> 
 <VisualizationPage />
 </main>
  );
}