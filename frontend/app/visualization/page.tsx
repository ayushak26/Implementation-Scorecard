// app/visualization/page.tsx
import VisualizationPage from "../components/VisualizationPage";

export const dynamic = "force-dynamic"; // optional, avoids caching during dev

export default function VisualizationRoute() {
  return <VisualizationPage />;
}
