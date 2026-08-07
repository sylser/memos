import { uniqBy } from "lodash-es";
import { CheckIcon, FileIcon, ImageIcon, LinkIcon, LoaderIcon, MapPinIcon, Maximize2Icon, MicIcon, PlusIcon, TypeIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { LinkMemoDialog, LocationDialog } from "@/components/MemoMetadata";
import { useIPGeocoding, useReverseGeocoding } from "@/components/map";
import type { MapPoint } from "@/components/map/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebouncedEffect } from "@/hooks";
import type { MemoRelation } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";
import { useFileUpload, useLinkMemo, useLocation } from "../hooks";
import { useEditorContext, useEditorSelector } from "../state";
import type { InsertMenuProps } from "../types";
import type { LocalFile } from "../types/attachment";

const InsertMenu = (props: InsertMenuProps) => {
  const t = useTranslate();
  const { actions, dispatch } = useEditorContext();
  const relations = useEditorSelector((s) => s.metadata.relations);
  const {
    location: initialLocation,
    onLocationChange,
    onToggleFocusMode,
    onToggleFormattingToolbar,
    isFormattingToolbarVisible,
    isUploading: isUploadingProp,
  } = props;

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);

  const { fileInputRef, selectingFlag, handleFileInputChange, handleUploadClick } = useFileUpload((newFiles: LocalFile[]) => {
    newFiles.forEach((file) => dispatch(actions.addLocalFile(file)));
  });

  const linkMemo = useLinkMemo({
    isOpen: linkDialogOpen,
    currentMemoName: props.memoName,
    existingRelations: relations,
    onAddRelation: (relation: MemoRelation) => {
      dispatch(actions.setMetadata({ relations: uniqBy([...relations, relation], (r) => r.relatedMemo?.name) }));
      setLinkDialogOpen(false);
    },
  });

  const location = useLocation(props.location);
  const {
    state: locationState,
    locationInitialized,
    handlePositionChange: handleLocationPositionChange,
    getLocation,
    reset: locationReset,
    updateCoordinate,
    setPlaceholder,
  } = location;

  const { data: ipLocation, isFetching: isIPLocationFetching, refetch: refetchIPLocation } = useIPGeocoding();

  const [debouncedPosition, setDebouncedPosition] = useState<MapPoint | undefined>(undefined);

  useDebouncedEffect(
    () => {
      setDebouncedPosition(locationState.position);
    },
    1000,
    [locationState.position],
  );

  const { data: displayName } = useReverseGeocoding(debouncedPosition?.lat, debouncedPosition?.lng);

  const applyIPLocation = useCallback(
    (result = ipLocation) => {
      const rectangle = result?.rectangle;
      if (!rectangle || typeof rectangle !== "string" || !rectangle.includes(";")) {
        return false;
      }
      const [leftBottom, rightTop] = rectangle.split(";");
      const [lng1, lat1] = leftBottom.split(",").map(Number);
      const [lng2, lat2] = rightTop.split(",").map(Number);
      if (![lng1, lat1, lng2, lat2].every((value) => Number.isFinite(value))) {
        return false;
      }
      handleLocationPositionChange({ lat: (lat1 + lat2) / 2, lng: (lng1 + lng2) / 2 });
      if (result?.address) {
        setPlaceholder(result.address);
      }
      return true;
    },
    [handleLocationPositionChange, ipLocation, setPlaceholder],
  );

  // Seed placeholder/map from IP before the user picks a point or reverse-geocode returns.
  useEffect(() => {
    if (initialLocation || locationInitialized || locationState.position || !ipLocation) {
      return;
    }
    if (locationDialogOpen) {
      applyIPLocation(ipLocation);
      return;
    }
    if (ipLocation.address) {
      setPlaceholder(ipLocation.address);
    }
  }, [applyIPLocation, initialLocation, ipLocation, locationDialogOpen, locationInitialized, locationState.position, setPlaceholder]);

  useEffect(() => {
    if (displayName) {
      setPlaceholder(displayName);
    }
  }, [displayName, setPlaceholder]);

  const isUploading = selectingFlag || isUploadingProp;

  const handleOpenLinkDialog = useCallback(() => {
    setLinkDialogOpen(true);
  }, []);

  const handleLocationClick = useCallback(async () => {
    setLocationDialogOpen(true);
    if (initialLocation || locationInitialized || locationState.position) {
      return;
    }

    // Flow: public IP -> Amap IP location -> map center from rectangle.
    if (applyIPLocation(ipLocation)) {
      return;
    }

    if (!isIPLocationFetching) {
      try {
        const refreshed = await refetchIPLocation();
        applyIPLocation(refreshed.data);
      } catch (error) {
        console.error("IP location failed:", error);
      }
    }
  }, [applyIPLocation, initialLocation, ipLocation, isIPLocationFetching, locationInitialized, locationState.position, refetchIPLocation]);

  const handleLocationConfirm = useCallback(() => {
    const newLocation = getLocation();
    if (newLocation) {
      onLocationChange(newLocation);
      setLocationDialogOpen(false);
    }
  }, [getLocation, onLocationChange]);

  const handleLocationCancel = useCallback(() => {
    locationReset();
    setLocationDialogOpen(false);
  }, [locationReset]);

  const handleMediaUploadClick = useCallback(() => {
    handleUploadClick("image/*,video/*");
  }, [handleUploadClick]);

  const handleFileUploadClick = useCallback(() => {
    handleUploadClick();
  }, [handleUploadClick]);

  // Insert actions (add content).
  const insertItems = [
    { key: "media", label: t("attachment-library.tabs.media"), icon: ImageIcon, onClick: handleMediaUploadClick },
    { key: "audio", label: t("editor.audio-recorder.trigger"), icon: MicIcon, onClick: props.onAudioRecorderClick },
    { key: "file", label: t("common.file"), icon: FileIcon, onClick: handleFileUploadClick },
    { key: "link", label: t("editor.insert-menu.link-memo"), icon: LinkIcon, onClick: handleOpenLinkDialog },
    { key: "location", label: t("editor.insert-menu.add-location"), icon: MapPinIcon, onClick: handleLocationClick },
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="secondary" size="icon" disabled={isUploading} />}>
          {isUploading ? <LoaderIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {insertItems.map((item) => (
            <DropdownMenuItem key={item.key} onClick={item.onClick}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {/* View toggles: focus mode + formatting-toolbar visibility. */}
          <DropdownMenuItem onClick={onToggleFocusMode}>
            <Maximize2Icon className="w-4 h-4" />
            {t("editor.focus-mode")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleFormattingToolbar}>
            <TypeIcon className="w-4 h-4" />
            {t("editor.formatting-toolbar")}
            {isFormattingToolbarVisible && <CheckIcon className="w-4 h-4 ml-auto" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file input */}
      <input
        className="hidden"
        ref={fileInputRef}
        disabled={isUploading}
        onChange={handleFileInputChange}
        type="file"
        multiple={true}
        accept="*"
      />

      <LinkMemoDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        searchText={linkMemo.searchText}
        onSearchChange={linkMemo.setSearchText}
        filteredMemos={linkMemo.filteredMemos}
        isFetching={linkMemo.isFetching}
        onSelectMemo={linkMemo.addMemoRelation}
        isAlreadyLinked={linkMemo.isAlreadyLinked}
      />

      <LocationDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        state={locationState}
        onPositionChange={handleLocationPositionChange}
        onUpdateCoordinate={updateCoordinate}
        onPlaceholderChange={setPlaceholder}
        onCancel={handleLocationCancel}
        onConfirm={handleLocationConfirm}
      />
    </>
  );
};

export default InsertMenu;
