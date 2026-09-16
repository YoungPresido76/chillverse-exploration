import { WorldCanvas } from "../world/WorldCanvas";
import { Hud } from "../ui/Hud";
import { Joystick } from "../ui/Joystick";
import { ChamberSheet } from "../ui/ChamberSheet";
import { ResultModal } from "../ui/ResultModal";
import { WorldToast } from "../ui/WorldToast";
import { useGame } from "../store";

export default function ExploreScreen() {
  const mapId = useGame((s) => s.activeMapId);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg">
      <WorldCanvas mapId={mapId} />
      <Hud />
      <Joystick />
      <ChamberSheet />
      <WorldToast />
      <ResultModal />
    </div>
  );
}
