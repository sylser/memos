import L, { LatLng } from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLinkIcon, MinusIcon, PlusIcon } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { cn } from "@/lib/utils";
import { defaultMarkerIcon, ThemedTileLayer } from "./map-utils";
import type { MapPoint } from "./types";

const toLatLng = (point: MapPoint): LatLng => new LatLng(point.lat, point.lng);
const fromLatLng = (latlng: LatLng): MapPoint => ({ lat: latlng.lat, lng: latlng.lng });

interface MarkerProps {
  position: LatLng | undefined;
  onChange: (position: MapPoint) => void;
  readonly?: boolean;
}

const LocationMarker = (props: MarkerProps) => {
  const [position, setPosition] = useState(props.position);
  const initializedRef = useRef(false);

  const map = useMapEvents({
    click(e) {
      if (props.readonly) {
        return;
      }

      setPosition(e.latlng);
      map.locate();
      onChange(fromLatLng(e.latlng));
    },
    locationfound() {},
  });

  useEffect(() => {
    if (!initializedRef.current) {
      map.locate();
      initializedRef.current = true;
    }
  }, [map]);

  // Keep marker and map in sync with external position updates
  useEffect(() => {
    if (props.position) {
      setPosition(props.position);
      map.setView(props.position);
    } else {
      setPosition(undefined);
    }
  }, [props.position, map]);

  return position === undefined ? null : <Marker position={position} icon={defaultMarkerIcon}></Marker>;
};

// Reusable glass-style button component
interface GlassButtonProps {
  icon: ReactNode;
  onClick: () => void;
  ariaLabel: string;
  title: string;
}

const GlassButton = ({ icon, onClick, ariaLabel, title }: GlassButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        "inline-flex items-center justify-center h-8 w-8 rounded-lg",
        "cursor-pointer border border-border/80 bg-background/88 text-foreground shadow-sm backdrop-blur-md transition-all duration-200",
        "hover:scale-105 hover:bg-background hover:shadow-md active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-blue-500",
      )}
    >
      {icon}
    </button>
  );
};

// Container for all map control buttons
interface ControlButtonsProps {
  position: MapPoint | undefined;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOpenGoogleMaps: () => void;
}

const ControlButtons = ({ position, onZoomIn, onZoomOut, onOpenGoogleMaps }: ControlButtonsProps) => {
  return (
    <div className="flex flex-col gap-1.5">
      {position && (
        <GlassButton
          icon={<ExternalLinkIcon size={16} className="text-foreground" />}
          onClick={onOpenGoogleMaps}
          ariaLabel="Open location in Google Maps"
          title="Open in Google Maps"
        />
      )}
      <GlassButton icon={<PlusIcon size={16} className="text-foreground" />} onClick={onZoomIn} ariaLabel="Zoom in" title="Zoom in" />
      <GlassButton icon={<MinusIcon size={16} className="text-foreground" />} onClick={onZoomOut} ariaLabel="Zoom out" title="Zoom out" />
    </div>
  );
};

// Custom Leaflet Control class
class MapControlsContainer extends L.Control {
  private container: HTMLDivElement | undefined = undefined;

  onAdd() {
    this.container = L.DomUtil.create("div", "");
    this.container.style.pointerEvents = "auto";

    // Prevent map interactions when clicking controls
    L.DomEvent.disableClickPropagation(this.container);
    L.DomEvent.disableScrollPropagation(this.container);

    return this.container;
  }

  onRemove() {
    this.container = undefined;
  }

  getContainer() {
    return this.container;
  }
}

interface MapControlsProps {
  position: MapPoint | undefined;
}

const MapControls = ({ position }: MapControlsProps) => {
  const map = useMap();
  const controlRef = useRef<MapControlsContainer | null>(null);
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);

  const handleOpenInGoogleMaps = () => {
    if (!position) return;
    const url = `https://uri.amap.com/marker?position=${position.lng},${position.lat}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  useEffect(() => {
    // Create custom Leaflet control
    const control = new MapControlsContainer({ position: "topright" });
    controlRef.current = control;
    control.addTo(map);

    // Get container and render React component into it
    const container = control.getContainer();
    if (container) {
      rootRef.current = createRoot(container);
      rootRef.current.render(
        <ControlButtons position={position} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onOpenGoogleMaps={handleOpenInGoogleMaps} />,
      );
    }

    return () => {
      // Cleanup: unmount React component and remove control
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
      if (controlRef.current) {
        controlRef.current.remove();
        controlRef.current = null;
      }
    };
  }, [map]);

  // Update rendered content when position changes
  useEffect(() => {
    if (rootRef.current) {
      rootRef.current.render(
        <ControlButtons position={position} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onOpenGoogleMaps={handleOpenInGoogleMaps} />,
      );
    }
  }, [position]);

  return null;
};

const MapCleanup = () => {
  const map = useMap();

  useEffect(() => {
    return () => {
      // Cleanup map instance when component unmounts
      setTimeout(() => {
        if (map) {
          try {
            map.remove();
          } catch {
            // Ignore errors during cleanup
          }
        }
      }, 0);
    };
  }, [map]);

  return null;
};

interface MapProps {
  readonly?: boolean;
  latlng?: MapPoint;
  onChange?: (position: MapPoint) => void;
  className?: string;
}

const DEFAULT_CENTER: MapPoint = { lat: 48.8584, lng: 2.2945 };
const noopOnLocationChange = () => {};

const LocationPicker = ({ readonly: readOnly = false, latlng, onChange = noopOnLocationChange }: LocationPickerProps) => {
  const mapCenter = useMemo(() => toLatLng(latlng ?? DEFAULT_CENTER), [latlng?.lat, latlng?.lng]);
  const markerPosition = mapCenter;

  return (
    <MapContainer
      className="w-full h-72"
      center={position}
      zoom={13}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
    >
      <ThemedTileLayer />
      <LocationMarker position={markerPosition} readonly={readOnly} onChange={onChange} />
      <MapControls position={latlng} />
      <MapCleanup />
  );
};

export default LeafletMap;
